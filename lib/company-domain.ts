/**
 * Finds the employer's own website for a job.
 *
 * The saved link is Adzuna's tracked redirect. Following it server-side usually
 * lands on the employer's job page, whose root domain is their site. Two traps
 * the spec's "strip the subdomain" rule falls into, and this file avoids:
 *
 * - The landing page is often an applicant tracking system, not the employer:
 *   boards.greenhouse.io → greenhouse.io would research Greenhouse. Those hosts
 *   are refused and the company-name guess is used instead.
 * - "Strip to the last two labels" turns jobs.acme.co.uk into co.uk. Known
 *   two-part suffixes keep a third label.
 *
 * In practice the redirect is blocked, so a web search does most of the work
 * — see `resolveHomepage`.
 */

import { RESEARCH_REDIRECT_TIMEOUT_MS } from "@/lib/utils";

/** Suffixes under which a registrable domain has three labels, not two. */
const TWO_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.br",
  "co.in",
  "co.jp",
  "com.sg",
  "com.mx",
  "co.za",
]);

/**
 * Job boards and applicant tracking systems, by registrable domain. Landing on
 * one of these says nothing about where the employer lives.
 */
const NOT_EMPLOYER_DOMAINS = new Set([
  "adzuna.com",
  "adzuna.co.uk",
  "adzuna.com.au",
  "adzuna.ca",
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "workday.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "icims.com",
  "jobvite.com",
  "bamboohr.com",
  "workable.com",
  "recruitee.com",
  "teamtailor.com",
  "applytojob.com",
  "breezy.hr",
  "jazzhr.com",
  "rippling.com",
  "rippling-ats.com",
  "successfactors.com",
  "successfactors.eu",
  "taleo.net",
  "oraclecloud.com",
  "ultipro.com",
  "paylocity.com",
  "adp.com",
  "dayforcehcm.com",
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "dice.com",
  "monster.com",
  "careerbuilder.com",
  "simplyhired.com",
  "builtin.com",
  "wellfound.com",
]);

/** `jobs.acme.co.uk` → `acme.co.uk`; `careers.stripe.com` → `stripe.com`. */
export function registrableDomain(hostname: string): string | null {
  const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length < 2 || labels.some((label) => label.length === 0)) {
    return null;
  }

  const lastTwo = labels.slice(-2).join(".");
  if (TWO_PART_SUFFIXES.has(lastTwo)) {
    return labels.length >= 3 ? labels.slice(-3).join(".") : null;
  }
  return lastTwo;
}

/** The employer's domain from a URL, or null for a job board, ATS or IP. */
export function employerDomain(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  // An IP address has no registrable domain to research.
  if (/^[\d.]+$/.test(parsed.hostname) || parsed.hostname.includes(":")) {
    return null;
  }

  const domain = registrableDomain(parsed.hostname);
  if (!domain || NOT_EMPLOYER_DOMAINS.has(domain)) return null;
  return domain;
}

/** "Acme Corp, Inc." → ["acme"] — everything from the legal suffix on is dropped, letters and digits only. */
function nameWords(company: string): string[] {
  return company
    .replace(/\s*(,\s*)?(Inc\.?|LLC|Ltd\.?|Limited|Corp\.?|Corporation|Co\.?|GmbH|PLC|Pty)\b.*$/i, "")
    .toLowerCase()
    .normalize("NFKD")
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
}

/** "Acme Corp, Inc." → "acme". */
const compactName = (company: string): string => nameWords(company).join("");

/**
 * The company-name guess used as a fallback. Null when nothing usable is left.
 */
export function guessDomainFromCompany(company: string): string | null {
  const name = compactName(company);
  return name.length >= 2 ? `${name}.com` : null;
}

/**
 * The search result that is the company's own site: not a job board, and a
 * domain named after the company. Requiring the name match is what keeps a
 * directory page about the company (the top results for a small subsidiary)
 * from being researched as the company.
 *
 * Two passes. A domain spelling the whole name wins anywhere in the results
 * (worldview.space for "World View"). Failing that, the first domain spelling
 * the name's leading words (caci.com for "CACI International", boozallen.com
 * for "Booz Allen Hamilton"). Whole words only, so "Metal Works" never matches
 * meta.com. A leading-word match can still be a different company — apple.com
 * for "Apple Leisure Group" — which is what the homepage extraction's
 * `isCompanySite` check is for.
 */
export function pickCompanySite(urls: string[], company: string): string | null {
  const words = nameWords(company);
  const name = words.join("");
  if (name.length < 2) return null;

  const leading = new Set(
    words.map((_, i) => words.slice(0, i + 1).join("")).filter((part) => part.length >= 3),
  );

  const candidates = urls.flatMap((url) => {
    const domain = employerDomain(url);
    if (!domain) return [];
    return [{ domain, label: domain.split(".")[0].replace(/[^a-z0-9]/g, "") }];
  });

  const whole = candidates.find(({ label }) => label === name);
  if (whole) return whole.domain;
  return candidates.find(({ label }) => leading.has(label))?.domain ?? null;
}

const isAdzunaUrl = (url: string): boolean => {
  try {
    const domain = registrableDomain(new URL(url).hostname);
    return domain !== null && domain.startsWith("adzuna.");
  } catch {
    return false;
  }
};

export type Homepage = {
  url: string;
  /** Where the URL came from — logged, so a wrong company can be traced. */
  via: "redirect" | "link" | "search" | "company_name";
};

/**
 * The employer's homepage, or null when there is nothing to go on. Tried in
 * order:
 *
 * 1. The spec's redirect follow. Adzuna currently answers it with a 403 bot
 *    block (measured on every stored link, 2026-10-05), so this rarely lands,
 *    but it costs well under a second when it fails.
 * 2. A web search for the company's official site.
 * 3. The spec's company-name guess — wrong for most multi-word names, which
 *    is why the homepage extraction also checks the page is the company's.
 *
 * Only an Adzuna link is fetched. Any other saved link is read for its host
 * without a request, so this never makes the server fetch an arbitrary URL.
 * Never throws.
 */
export async function resolveHomepage(
  link: string | null,
  company: string,
  search: (query: string) => Promise<string[]>,
): Promise<Homepage | null> {
  if (link && isAdzunaUrl(link)) {
    try {
      const response = await fetch(link, {
        redirect: "follow",
        signal: AbortSignal.timeout(RESEARCH_REDIRECT_TIMEOUT_MS),
      });
      // Only the final URL matters; the body is never read.
      await response.body?.cancel();
      const domain = employerDomain(response.url);
      if (domain) return { url: `https://${domain}`, via: "redirect" };
    } catch (error) {
      console.error("[lib/company-domain] redirect", String(error));
    }
  } else if (link) {
    const domain = employerDomain(link);
    if (domain) return { url: `https://${domain}`, via: "link" };
  }

  const found = pickCompanySite(await search(`${company} official website`), company);
  if (found) return { url: `https://${found}`, via: "search" };

  const guess = guessDomainFromCompany(company);
  return guess ? { url: `https://www.${guess}`, via: "company_name" } : null;
}
