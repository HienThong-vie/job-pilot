import type { InsForgeClient } from "@insforge/sdk";
import { APIError } from "openai";
import { z } from "zod";

import { logAgent, type AgentLogLevel } from "@/agent/agent-logs";
import {
  openResearchSession,
  readPage,
  searchWeb,
  type PageContent,
  type PageLink,
  type ResearchSession,
} from "@/lib/browserbase";
import { resolveHomepage, registrableDomain } from "@/lib/company-domain";
import { companyDossierSchema } from "@/lib/company-dossier";
import type { ResearchJob } from "@/lib/jobs";
import { createOpenAI, MODEL_PARAMS } from "@/lib/openai";
import {
  MAX_DOSSIER_ITEMS,
  MAX_RESEARCH_SUBPAGES,
  MAX_TECH_STACK_ITEMS,
  RESEARCH_BROWSE_BUDGET_MS,
  RESEARCH_EXTRACT_TIMEOUT_MS,
  RESEARCH_SYNTHESIS_TIMEOUT_MS,
} from "@/lib/utils";
import type { CompanyDossier, Profile } from "@/types";

/**
 * Company research — `build-plan.md` 13.
 *
 * Three steps: one Browserbase session reads the employer's homepage and up to
 * three of its pages, GPT-4o pulls the substance out of each page as it
 * arrives, and once the browser is closed GPT-4o fuses that research with the
 * job and the profile (both from the DB, never re-fetched) into the dossier.
 *
 * The browser is best-effort. Any failure in it is logged and the dossier is
 * still written from the job and the profile — except on a re-run, where a
 * dossier built from the website is kept rather than replaced by a thinner one.
 * Every step is time-bounded; the budget is in `lib/utils.ts`.
 */

const EXTRACT_TEMPERATURE = 0.3;
const EXTRACT_MAX_TOKENS = 600;
const SYNTHESIS_TEMPERATURE = 0.4;
/**
 * `library-docs.md` once budgeted 800, which nine fields at up to five
 * one-to-two sentence items each overrun. The prompt bounds every list.
 */
const SYNTHESIS_MAX_TOKENS = 1500;
const MAX_PROMPT_RESPONSIBILITIES = 400;
const MAX_CANDIDATE_LINKS = 60;

const LINK_KINDS = [
  "about",
  "careers",
  "blog",
  "engineering",
  "product",
  "team",
  "other",
] as const;
type LinkKind = (typeof LINK_KINDS)[number];

/** Which sub-pages to read first — the spec prefers these over careers. */
const KIND_PRIORITY: Record<LinkKind, number> = {
  about: 0,
  engineering: 1,
  blog: 2,
  product: 3,
  team: 4,
  careers: 5,
  other: 99,
};

/** Never worth a page visit, whatever the model thinks. */
const SKIP_LINK =
  /\.(pdf|png|jpe?g|svg|zip)(\?|$)|\/(login|signin|sign-in|signup|sign-up|register|privacy|terms|legal|cookies?|cart|checkout)\b/i;

const strings = z.array(z.unknown()).catch([]).transform((items) =>
  items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean),
);

const homepageSchema = z.object({
  // Required, with no fallback: a missing answer is a failed extraction, not a
  // verdict that the page belongs to someone else.
  isCompanySite: z.boolean(),
  oneLiner: z.string().trim().catch(""),
  productSummary: z.string().trim().catch(""),
  signals: strings,
  pageLinks: z
    .array(
      z.object({
        index: z.number().int(),
        kind: z.enum(LINK_KINDS).catch("other"),
      }),
    )
    .catch([]),
});

const subPageSchema = z.object({
  keyPoints: strings,
  technologies: strings,
  valuesOrCulture: strings,
  notable: strings,
});

type HomepageFindings = {
  url: string;
  oneLiner: string;
  productSummary: string;
  signals: string[];
};

type SubPageFindings = z.infer<typeof subPageSchema> & { url: string; kind: LinkKind };

type CompanyResearch = {
  homepage: HomepageFindings;
  pages: SubPageFindings[];
};

type Log = (level: AgentLogLevel, message: string) => Promise<void>;

type JsonResult =
  | { success: true; data: unknown }
  /** `status` is the HTTP status when OpenRouter answered with an error. */
  | { success: false; error: string; status?: number };

async function completeJson(
  system: string,
  user: string,
  options: { maxTokens: number; temperature: number; timeoutMs: number },
): Promise<JsonResult> {
  const openai = createOpenAI();
  if (!openai) return { success: false, error: "OPENROUTER_API_KEY is not set" };

  try {
    const response = await openai.chat.completions.create(
      {
        ...MODEL_PARAMS,
        response_format: { type: "json_object" },
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      // One attempt: the route's time budget has no room for a retry.
      { timeout: options.timeoutMs, maxRetries: 0 },
    );

    const choice = response.choices[0];
    if (choice?.finish_reason === "length") {
      return { success: false, error: "response truncated at max_tokens" };
    }
    const content = choice?.message.content;
    if (!content) return { success: false, error: "empty completion" };

    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      ...(error instanceof APIError && error.status ? { status: error.status } : {}),
    };
  }
}

/** OpenRouter's "this account cannot pay for the request". */
const PAYMENT_REQUIRED = 402;

const HOMEPAGE_SYSTEM = (company: string) => `You read the text of a web page that is supposed to be the homepage of the company "${company}". Return only valid JSON.

This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then pick the internal links most worth visiting to research them as an employer.

Return an object with exactly these keys:
- isCompanySite: boolean — true only if this page is the website of "${company}". False for a parked or for-sale domain, an error page, a bot check, or a different organisation with a similar name.
- oneLiner: string — what the company does in one sentence, or "" if the page does not say
- productSummary: string — what they build or sell and who it's for, or ""
- signals: array of at most ${MAX_DOSSIER_ITEMS} strings — funding, notable customers, scale, mission, recent news, only as stated on the page
- pageLinks: array of at most 6 objects { index, kind } — index is the number of a link from the LINKS list, kind is one of ${LINK_KINDS.join(", ")}. Prefer about, engineering, blog and product pages over careers.

Only use what is written on the page. Never invent facts.`;

const SUB_PAGE_SYSTEM = `You read the text of one page from a company's website. Return only valid JSON.

Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.

Return an object with exactly these keys, each an array of at most ${MAX_DOSSIER_ITEMS} short strings ([] when the page says nothing on it):
- keyPoints
- technologies — specific languages, frameworks, tools, platforms
- valuesOrCulture — stated values, working style, team norms
- notable — customers, funding, scale, projects, awards

Only use what is written on the page. Never invent facts.`;

/** Same-site links the model may choose from, numbered for the prompt. */
function candidateLinks(page: PageContent): PageLink[] {
  const site = registrableDomain(new URL(page.url).hostname);
  const self = page.url.replace(/[#?].*$/, "").replace(/\/$/, "");
  const seen = new Set<string>([self]);
  const links: PageLink[] = [];

  for (const link of page.links) {
    let url: URL;
    try {
      url = new URL(link.url);
    } catch {
      continue;
    }
    if (registrableDomain(url.hostname) !== site) continue;
    const key = `${url.origin}${url.pathname}`.replace(/\/$/, "");
    if (seen.has(key) || SKIP_LINK.test(key)) continue;
    seen.add(key);
    links.push({ url: key, text: link.text });
    if (links.length === MAX_CANDIDATE_LINKS) break;
  }
  return links;
}

const EXTRACT_OPTIONS = {
  maxTokens: EXTRACT_MAX_TOKENS,
  temperature: EXTRACT_TEMPERATURE,
  timeoutMs: RESEARCH_EXTRACT_TIMEOUT_MS,
};

type HomepageResult =
  | { success: true; findings: HomepageFindings; next: { url: string; kind: LinkKind }[] }
  | { success: true; findings: null; why: string }
  | { success: false; error: string };

async function extractHomepage(
  page: PageContent,
  company: string,
): Promise<HomepageResult> {
  const links = candidateLinks(page);
  const user = `URL: ${page.url}
TITLE: ${page.title}

PAGE TEXT:
${page.text}

LINKS:
${links.map((link, index) => `${index}. ${link.url} — ${link.text}`).join("\n")}`;

  const result = await completeJson(HOMEPAGE_SYSTEM(company), user, EXTRACT_OPTIONS);
  if (!result.success) return result;

  const parsed = homepageSchema.safeParse(result.data);
  if (!parsed.success) {
    return { success: false, error: `homepage schema: ${parsed.error.message}` };
  }

  const { isCompanySite, oneLiner, productSummary, signals, pageLinks } = parsed.data;
  // The spec's bail-out: no description of the company means the wrong site or
  // a parked domain. A page about some other company is the same case.
  if (!isCompanySite) {
    return { success: true, findings: null, why: `${page.url} is not ${company}'s website` };
  }
  if (!oneLiner && !productSummary) {
    return { success: true, findings: null, why: `${page.url} does not say what ${company} does` };
  }

  // Indexes, not URLs, so a model can only pick a link that is on the page.
  const next = pageLinks
    .flatMap(({ index, kind }) => {
      const link = links[index];
      return link && kind !== "other" ? [{ url: link.url, kind }] : [];
    })
    .filter((link, i, all) => all.findIndex((other) => other.url === link.url) === i)
    .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
    .slice(0, MAX_RESEARCH_SUBPAGES);

  return {
    success: true,
    findings: { url: page.url, oneLiner, productSummary, signals: signals.slice(0, MAX_DOSSIER_ITEMS) },
    next,
  };
}

/**
 * The page's findings, or null when it had nothing useful. Never throws; a
 * failed extraction is logged here, because it only costs this one page.
 */
async function extractSubPage(
  page: PageContent,
  kind: LinkKind,
  log: Log,
): Promise<SubPageFindings | null> {
  const result = await completeJson(
    SUB_PAGE_SYSTEM,
    `URL: ${page.url}\nTITLE: ${page.title}\n\nPAGE TEXT:\n${page.text}`,
    EXTRACT_OPTIONS,
  );
  if (!result.success) {
    await log("warning", `Extraction failed for ${page.url}: ${result.error}`);
    return null;
  }

  const parsed = subPageSchema.safeParse(result.data);
  if (!parsed.success) {
    await log("warning", `Extraction schema for ${page.url}: ${parsed.error.message}`);
    return null;
  }

  const findings = parsed.data;
  const empty = Object.values(findings).every((items) => items.length === 0);
  return empty ? null : { ...findings, url: page.url, kind };
}

/**
 * One Browserbase session: homepage, then up to three sub-pages. Each sub-page
 * is extracted while the browser moves on to the next, and the session is
 * closed before the last extractions are awaited, so model calls never hold
 * the plan's only session slot. No new page is opened once
 * RESEARCH_BROWSE_BUDGET_MS has passed. Null when nothing usable was found.
 * Never throws; the session is always closed.
 */
async function browseCompany(
  homepageUrl: string,
  company: string,
  log: Log,
): Promise<CompanyResearch | null> {
  let session: ResearchSession | null = null;

  try {
    session = await openResearchSession();
    if (!session) {
      await log("warning", "BROWSERBASE_API_KEY is not set — skipping website research");
      return null;
    }

    // From here, not from the start: the extension wait and the launch have
    // budgets of their own.
    const deadline = Date.now() + RESEARCH_BROWSE_BUDGET_MS;
    const { page } = session;

    let homepage: PageContent;
    try {
      homepage = await readPage(page, homepageUrl);
    } catch (error) {
      await log("warning", `Could not load ${homepageUrl}: ${String(error)}`);
      return null;
    }

    const extracted = await extractHomepage(homepage, company);
    if (!extracted.success) {
      await log("warning", `Homepage extraction failed: ${extracted.error}`);
      return null;
    }
    if (!extracted.findings) {
      await log("warning", `${extracted.why} — researching from the job posting only`);
      return null;
    }

    const pending: Promise<SubPageFindings | null>[] = [];
    for (const link of extracted.next) {
      if (Date.now() >= deadline) {
        await log("warning", `Browsing budget used up — skipped ${link.url} and any later pages`);
        break;
      }
      try {
        const content = await readPage(page, link.url);
        pending.push(extractSubPage(content, link.kind, log));
      } catch (error) {
        await log("warning", `Could not load ${link.url}: ${String(error)}`);
      }
    }

    // Every page is read; only model calls remain. Free the session first.
    await session.close();

    const pages = (await Promise.all(pending)).filter(
      (findings): findings is SubPageFindings => findings !== null,
    );
    return { homepage: extracted.findings, pages };
  } catch (error) {
    await log("warning", `Website research failed: ${String(error)}`);
    return null;
  } finally {
    // The free plan allows one session at a time; a leaked one blocks the next
    // research until its api_timeout runs out. close() is idempotent.
    await session?.close();
  }
}

const SYNTHESIS_SYSTEM = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": string — 2 to 3 sentences,
  "techStack": string[] — at most ${MAX_TECH_STACK_ITEMS} technology names, no sentences,
  "culture": string[] — at most ${MAX_DOSSIER_ITEMS},
  "whyThisRole": string — 1 to 3 sentences,
  "yourEdge": string[] — at most ${MAX_DOSSIER_ITEMS},
  "gapsToAddress": string[] — at most ${MAX_DOSSIER_ITEMS},
  "smartQuestions": string[] — at most ${MAX_DOSSIER_ITEMS},
  "interviewPrep": string[] — at most ${MAX_DOSSIER_ITEMS}
}`;

/** Only what bears on the briefing — no name, contact details or salary. */
function synthesisPrompt(
  research: CompanyResearch | null,
  job: ResearchJob,
  profile: Profile,
): string {
  const companyResearch = research
    ? JSON.stringify(research)
    : "None — the company's website could not be researched. Work from the job posting and say what is inferred.";

  const workHistory = profile.work_experience.map((role) => ({
    title: role.title,
    company: role.company,
    responsibilities: role.responsibilities.slice(0, MAX_PROMPT_RESPONSIBILITIES),
  }));

  return `COMPANY RESEARCH (from their website):
${companyResearch}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description ?? "Not available"}
Matched skills (already computed): ${job.matched_skills.join(", ") || "none"}
Missing skills (already computed): ${job.missing_skills.join(", ") || "none"}

CANDIDATE PROFILE:
Current title: ${profile.current_title ?? "Not given"}
Experience: ${profile.years_experience ?? "unknown"} years, level ${profile.experience_level ?? "unknown"}
Skills: ${profile.skills.join(", ")}
Work history: ${JSON.stringify(workHistory)}`;
}

export type ResearchResult =
  | { success: true; data: CompanyDossier }
  | {
      success: false;
      /**
       * `kept_saved`: the website could not be researched this time and the
       * saved dossier was built from it, so it was left in place.
       * `ai_unavailable`: OpenRouter refused synthesis for lack of credits.
       */
      reason: "kept_saved" | "ai_unavailable" | "failed";
      error: string;
    };

/**
 * Researches the job's company and saves the dossier to
 * `jobs.company_research`, replacing any earlier one — unless this run could
 * not reach the website and the earlier one did. Never throws.
 */
export async function researchCompany(
  insforge: InsForgeClient,
  input: { userId: string; job: ResearchJob; profile: Profile },
): Promise<ResearchResult> {
  const { userId, job, profile } = input;
  const log: Log = (level, message) =>
    logAgent(insforge, { userId, runId: null, jobId: job.id, level, message });

  try {
    const homepage = await resolveHomepage(job.link, job.company, searchWeb);
    let research: CompanyResearch | null = null;

    if (homepage) {
      await log("info", `Researching ${job.company} at ${homepage.url} (found via ${homepage.via})`);
      research = await browseCompany(homepage.url, job.company, log);
    } else {
      await log("warning", `No website found for ${job.company} — researching from the job posting only`);
    }

    // A re-run that reached nothing would replace website research with a
    // dossier written from the job posting alone. Keep the better one, and
    // skip the synthesis call that would only be thrown away.
    if (!research && job.saved_research && job.saved_research.sources.length > 0) {
      const error = "website unreachable this run — kept the saved dossier";
      await log("warning", `${error} (from ${job.saved_research.sources.length} pages)`);
      return { success: false, reason: "kept_saved", error };
    }

    const result = await completeJson(
      SYNTHESIS_SYSTEM,
      synthesisPrompt(research, job, profile),
      {
        maxTokens: SYNTHESIS_MAX_TOKENS,
        temperature: SYNTHESIS_TEMPERATURE,
        timeoutMs: RESEARCH_SYNTHESIS_TIMEOUT_MS,
      },
    );
    if (!result.success) {
      await log("error", `Dossier synthesis failed: ${result.error}`);
      return {
        success: false,
        reason: result.status === PAYMENT_REQUIRED ? "ai_unavailable" : "failed",
        error: result.error,
      };
    }

    // Sources are the pages actually read, whatever the model claims. A
    // non-object reply gets an empty base and fails the schema below.
    const reply = typeof result.data === "object" && result.data !== null ? result.data : {};
    const sources = research
      ? [research.homepage.url, ...research.pages.map((page) => page.url)]
      : [];
    const parsed = companyDossierSchema.safeParse({ ...reply, sources });
    if (!parsed.success) {
      await log("error", `Dossier schema: ${parsed.error.message}`);
      return { success: false, reason: "failed", error: parsed.error.message };
    }

    const { error } = await insforge.database
      .from("jobs")
      .update({ company_research: parsed.data })
      .eq("id", job.id)
      .eq("user_id", userId)
      .select("id")
      .single();
    if (error) {
      await log("error", `Saving the dossier failed: ${error.message}`);
      return { success: false, reason: "failed", error: error.message };
    }

    // The schema drops duplicate URLs (a sub-page can redirect to the
    // homepage), so count what was saved, not what was read.
    const saved = parsed.data.sources.length;
    await log(
      "success",
      `Dossier saved for ${job.company} from ${saved} ${saved === 1 ? "page" : "pages"}`,
    );
    return { success: true, data: parsed.data };
  } catch (error) {
    await log("error", `Research failed: ${String(error)}`);
    return { success: false, reason: "failed", error: String(error) };
  }
}
