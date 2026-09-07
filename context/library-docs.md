# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to JobPilot.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Package name — corrected

There is no standalone `@insforge/ssr` npm package (confirmed 404 during
feature 02 Auth). The SSR helpers ship as subpaths of `@insforge/sdk`
(currently 1.5.2): `@insforge/sdk/ssr` and `@insforge/sdk/ssr/middleware`. The
package bundles its own `SDK-REFERENCE.md` — read it from
`node_modules/@insforge/sdk/SDK-REFERENCE.md` if anything below is unclear or
looks like it's drifted from a newer SDK version.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/sdk/ssr";

export const insforge = createBrowserClient();
// Reads NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY automatically.
```

```typescript
// lib/insforge-server.ts — server context only
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({
    cookies: await cookies(),
  });
};
```

**Rules:**

- Browser client — Client Components, browser-side auth state, realtime subscriptions. Its `auth` surface is intentionally read-only (`getCurrentUser`, `getProfile`, `getPublicAuthConfig`) — no `signInWithOAuth`/`signOut`, because the refresh token lives in an httpOnly cookie the browser never touches.
- Server client (`createServerClient`) — reads the access-token cookie only, for Server Components, Route Handlers, agent functions that just need to know the current user.
- Auth mutations (sign in, sign out, OAuth) — never through `createServerClient()`. Use `createAuthActions()` from the same `@insforge/sdk/ssr` entrypoint (see **OAuth** below) — it can write cookies, `createServerClient()` cannot.
- Never use browser client in server context
- Never use server client in browser context

---

### Auth — get current user

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const { data, error } = await insforge.auth.getCurrentUser();
if (!data.user) redirect("/login");
```

Note: it's `getCurrentUser()`, not `getUser()`.

---

### OAuth (Google / GitHub)

OAuth sign-in and code exchange run server-side only — the SSR browser client
does not auto-exchange callbacks like the plain `@insforge/sdk` browser client
does. Pattern verified working end-to-end (redirects to real Google/GitHub
consent screens) during feature 02 Auth:

```typescript
// actions/auth.ts — Server Action, kicks off the flow
"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function signInWithOAuthAction(provider: "google" | "github") {
  const headersList = await headers();
  const origin = `${headersList.get("x-forwarded-proto") ?? "http"}://${headersList.get("host")}`;
  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });

  const { data, error } = await auth.signInWithOAuth(provider, {
    redirectTo: `${origin}/callback`,
    skipBrowserRedirect: true, // required server-side — there is no window to redirect
  });

  if (error || !data.url) redirect("/login?error=oauth_failed");

  // PKCE codeVerifier must round-trip to the callback — stash it in a
  // short-lived httpOnly cookie, there's no other way to recover it there.
  if (data.codeVerifier) {
    cookieStore.set("insforge_code_verifier", data.codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  redirect(data.url); // outside any try/catch — redirect() throws by design
}
```

```typescript
// app/(auth)/callback/route.ts — Route Handler, not a page.
// Only a Route Handler can set the httpOnly session cookies via Set-Cookie.
import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const codeVerifier = request.cookies.get("insforge_code_verifier")?.value;
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const { error } = await auth.exchangeOAuthCode(code, codeVerifier);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));

  response.cookies.delete("insforge_code_verifier");
  return response;
}
```

```typescript
// proxy.ts (project root) — Next.js 16 renamed middleware.ts to proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { accessToken } = await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  // redirect to /login if a protected path and !accessToken — see proxy.ts
  return response;
}
```

**Rules:**

- `redirectTo` passed to `signInWithOAuth` must be in the InsForge dashboard's `allowedRedirectUrls` — there's no MCP tool for this, it's dashboard-only config.
- Never call `signInWithOAuth`/`exchangeOAuthCode` from a Client Component or the browser client — they aren't on its type surface.
- Never wrap a `redirect()` call in the same try/catch as the fallible work before it — Next.js implements `redirect()` by throwing, and a surrounding catch will swallow it.
- File is `proxy.ts` at the project root on Next.js 16+, not `middleware.ts` — the old filename is silently ignored (no build error, no route protection), which is a silent auth bypass if missed.

---

### DB Queries

> **Corrected in feature 06.** Queries hang off `insforge.database`, **not** the
> client root — `insforge.from(...)` does not exist. Verified against
> `node_modules/@insforge/sdk/dist/client-DZHoCptg.d.ts` (`readonly database: Database`).
> The builder itself is PostgREST's, so the chained methods are as documented.

```typescript
// Read
const { data, error } = await insforge.database
  .from("jobs")
  .select("*")
  .eq("user_id", user.id)
  .order("found_at", { ascending: false });

// Insert
const { data, error } = await insforge.database
  .from("jobs")
  .insert({ user_id: user.id, title, company, match_score })
  .select()
  .single();

// Update
const { error } = await insforge.database
  .from("jobs")
  .update({ company_research: dossier })
  .eq("id", jobId)
  .eq("user_id", user.id); // always scope to user
```

**Rules:**

- Always scope queries to `user_id` — never query without user filter
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row
- On an **update**, chain `.select("id").single()` when exactly one row must
  change. PostgREST returns no rows and no error for an update that matched
  nothing; `.single()` turns that silent no-op into a real error.

**RLS is already enforcing this server-side** (see the InsForge Database & RLS
Pattern section of `architecture.md`) — every table has a
`for all to authenticated using (user_id = auth.uid())` policy, so a query that
forgets its user filter returns only the caller's rows rather than everyone's.
Keep writing the explicit `.eq('user_id', user.id)` anyway: it makes the intent
readable, and it keeps the query correct if it ever moves to a context that
bypasses RLS.

Verified against the live backend during feature 04: an unauthenticated caller
holding the real anon key gets `42501 permission denied` on all four tables, and
an authenticated caller sees only their own rows, cannot insert a row owned by
another user (`403`, RLS violation), and cannot violate a CHECK constraint
(`400`, `23514`).

---

### Storage

> **Resolved in feature 06.** The warning that used to sit here was half right.
> There is no `upsert` option — `upload(path, file)` has plain PUT semantics and
> replaces whatever is at that key, which is exactly the base-resume behaviour we
> want. But `getPublicUrl()` **does** exist, and so does **`createSignedUrl()`**,
> which is the right tool for this private bucket. Verified against
> `node_modules/@insforge/sdk/dist/client-DZHoCptg.d.ts`.

The installed surface of `insforge.storage.from(bucket)`:

| Method                            | Returns                            | Notes                                                     |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `upload(path, file)`              | `{ data: StorageFileSchema, error }` | `File \| Blob`. PUT semantics — replaces the key in place. |
| `uploadAuto(file)`                | `{ data, error }`                    | Auto-generated collision-free key. Not what we want here.  |
| `download(path)`                  | `{ data: Blob, error }`              | Needs the caller's session.                                |
| `list({ prefix, limit })`         | `{ data: { objects, ... }, error }`  |                                                            |
| `remove(path \| path[])`          | `{ data, error }`                    | Up to 1000 keys.                                           |
| `getPublicUrl(path)`              | `{ data: { publicUrl }, error }`     | **Public buckets only** — pure string building, no call.   |
| `createSignedUrl(path, expiresIn)` | `{ data: { signedUrl, expiresAt }, error }` | Private buckets. Default 3600s, max 604800 (7d).   |

```typescript
// Upload — always derive the path from the session user, never the client
const key = `${user.id}/resume.pdf`;
const { error } = await insforge.storage.from("resumes").upload(key, file);

// Save the key (not a URL) to the DB
await insforge.database
  .from("profiles")
  .update({ resume_pdf_url: key })
  .eq("id", user.id);
```

**Storage paths:**

- Base resume: `resumes/{user_id}/resume.pdf`

**Private bucket reads:**

The `resumes` bucket is private (`isPublic: false`, confirmed via `list-buckets`),
matching `architecture.md`'s "authenticated users only, own files only". So
`profiles.resume_pdf_url` holds the object **key** (`{user_id}/resume.pdf`), not a
fetchable URL. To show or hand out the file, mint a short-lived link with
`createSignedUrl(key, ttl)` — it needs no session to fetch, so it drops straight
into an `<a href>` or `<iframe src>`. Server-side processing (feature 07's
pdf-parse) uses `download(key)` and works on the Blob directly.

**Do not embed a signed URL in a rendered page.** It is credential-free and
time-limited, which is the worst combination for a link sitting in HTML: it
leaks if the markup does, and it expires while the page is open, so the user
clicks a dead link. `app/api/resume/view/route.ts` is the pattern instead — a
redirect-only Route Handler that checks the session, mints a 60-second signed
URL, and 302s to it. The page holds a stable in-app href, every click gets a
fresh credential, and a signed-out request lands on /login.

**Server Actions have a 1MB body limit.**

A resume arriving through a Server Action is subject to Next's
`serverActions.bodySizeLimit`, which defaults to **1MB** — well under the 5MB the
resume dropzone promises. `next.config.ts` raises it to `6mb`: the limit applies to
the raw multipart body including boundaries and part headers, so it needs headroom
above the real 5MB cap, which is enforced in `uploadResume` itself.

Raising the limit does not remove the cliff, it only moves it. Next rejects an
over-limit body **before the action runs**, so the action's own friendly error never
gets a chance to return — the user sees a framework error instead. Any file input
wired to a Server Action therefore needs the size check on the client as well, so
an oversized file is never sent. Keep the server check too: the client is not a
security boundary. `MAX_RESUME_BYTES`, `RESUME_MIME_TYPE` and the two error strings
live in `lib/utils.ts` so both sides state the limit once.

**Rules:**

- Uploading to an existing key replaces it — that is the base-resume behaviour we want
- Always save the returned key back to the DB after upload
- Never write files to disk — always upload buffer directly to storage
- Always derive the storage path from the session user's id server-side. InsForge's
  own per-object "own files only" enforcement is **unverified** — do not rely on it
  as the only thing stopping one user from reading another's resume

## Adzuna API

**Check first:** Check AGENTS.md for an installed Adzuna skill. If none exists — use this file and the official Adzuna API docs.

### Job Search

```typescript
// lib/adzuna.ts
export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: jobTitle,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Only add where if location is provided
  if (location) {
    params.set("where", location);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}
```

### Response Shape

Each Adzuna job result contains:

```typescript
type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1"; // "1" means salary is estimated
  contract_type?: string;
  created: string; // ISO date string
  category: { tag: string; label: string };
};
```

### Saving Jobs to DB

```typescript
// Map Adzuna result to jobs table
const jobRecord = {
  user_id: userId,
  run_id: runId,
  source: "search", // always 'search' for Adzuna jobs
  source_url: job.redirect_url,
  external_apply_url: job.redirect_url,
  title: job.title,
  company: job.company.display_name,
  location: job.location.display_name,
  salary: job.salary_min
    ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max! / 1000)}k`
    : null,
  job_type: job.contract_type || "fulltime",
  about_role: job.description, // Adzuna returns snippet — used as description
  match_score: scoredJob.matchScore,
  match_reason: scoredJob.matchReason,
  matched_skills: scoredJob.matchedSkills,
  missing_skills: scoredJob.missingSkills,
  found_at: new Date().toISOString(),
};
```

**Rules:**

- Always include `category=it-jobs` — never search Adzuna without this filter
- Never pass `where` if location is empty — omit the parameter entirely
- `source` is always `'search'` for Adzuna jobs — never any other value
- `salary_is_predicted: "1"` means Adzuna estimated the salary — this is normal
- Adzuna description is a snippet — GPT-4o scores from it, not a full description
- Default country to `'us'` — support `gb`, `au`, `ca` as alternatives

---

## Browserbase

**Check first:** Check AGENTS.md for an installed Browserbase skill. If a Browserbase MCP server is configured — use it. The skill/MCP will have the latest session management and API patterns.

### Session Creation — Company Research

```typescript
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Single session for company research — sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

**Important — Browserbase runs independently from your Next.js server:**
Browserbase sessions run on Browserbase's cloud infrastructure, not inside your Next.js API route. The API route triggers the Browserbase session and returns a response while the session continues running independently on Browserbase's platform. Do not add `maxDuration` or any timeout configuration to Next.js API routes to accommodate Browserbase session length.

**Rules:**

- Always use single sessions — never parallel sessions (free plan limit)
- Session timeout is 120 seconds — sufficient for 3-4 page visits
- Always end sessions cleanly — call stagehand.close() when done
- Project ID always from `process.env.BROWSERBASE_PROJECT_ID` — never hardcode
- Browserbase client lives in `lib/browserbase.ts` — always import from there

---

## Stagehand

**Check first:** Check AGENTS.md for an installed Stagehand skill. If a Stagehand MCP server is configured — use it. The skill/MCP will have the latest act() and extract() patterns.

### Initialisation

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  browserbaseSessionID: session.id,
  model: { modelName: "openai/gpt-4o", apiKey: process.env.OPENAI_API_KEY! },
  disablePino: true,
});

await stagehand.init();
const page = stagehand.context.activePage()!;
```

### extract()

```typescript
import { z } from "zod";

const result = await stagehand.extract({
  instruction:
    "Extract the company overview, main product description, and any technology mentions from this page.",
  schema: z.object({
    companyOverview: z.string().optional(),
    mainProduct: z.string().optional(),
    techMentions: z.array(z.string()).optional(),
    navLinks: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
        }),
      )
      .optional(),
  }),
});
```

### act()

```typescript
// Always wrap in try/catch
try {
  await stagehand.act({
    action: "Click the About link in the navigation",
  });
} catch (error) {
  await logAgentError(jobId, null, error);
}
```

## Company Research Section

Replace the existing Stagehand "Company Research Pattern" section in library-docs.md with this:

---

### Company Research Pattern

Three-step process: homepage extraction → sub-page extraction → GPT-4o synthesis.
Job description and user profile come from DB — never re-fetch what you already have.
Browser's only job is the company website.

```typescript
// Step 1 — Homepage extraction
const homepageData = await stagehand.extract({
  instruction:
    "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
  schema: z.object({
    oneLiner: z.string().describe("What the company does in one sentence"),
    productSummary: z
      .string()
      .describe("What they build/sell and who it's for"),
    signals: z
      .array(z.string())
      .describe("Funding, notable customers, scale, mission, recent news"),
    pageLinks: z
      .array(
        z.object({
          url: z.string(),
          kind: z.enum([
            "about",
            "careers",
            "blog",
            "engineering",
            "product",
            "team",
            "other",
          ]),
        }),
      )
      .describe("Internal links worth visiting"),
  }),
});

// If oneLiner and productSummary are empty — wrong site or parked domain
// Skip to synthesis with job description and profile only
if (!homepageData.oneLiner && !homepageData.productSummary) {
  await stagehand.close();
  // proceed to synthesis with empty companyResearch
}

// Step 2 — Sub-page extraction (max 3, prefer about/blog/engineering/product over careers)
const subPageData = await stagehand.extract({
  instruction:
    "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
  schema: z.object({
    keyPoints: z.array(z.string()),
    technologies: z
      .array(z.string())
      .describe("Specific languages, frameworks, tools, platforms"),
    valuesOrCulture: z
      .array(z.string())
      .describe("Stated values, working style, team norms"),
    notable: z
      .array(z.string())
      .describe("Customers, funding, scale, projects, awards"),
  }),
});

// Step 3 — GPT-4o synthesis (after browser closes)
// Feed three data sources: company research + job from DB + profile from DB
const systemPrompt = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": string,
  "techStack": string[],
  "culture": string[],
  "whyThisRole": string,
  "yourEdge": string[],
  "gapsToAddress": string[],
  "smartQuestions": string[],
  "interviewPrep": string[],
  "sources": string[]
}`;

const userPrompt = `COMPANY RESEARCH (from their website):
${JSON.stringify(companyResearch)}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Matched skills (already computed): ${job.matched_skills.join(", ")}
Missing skills (already computed): ${job.missing_skills.join(", ")}

CANDIDATE PROFILE:
Current title: ${profile.current_title}
Experience: ${profile.years_experience} years, level ${profile.experience_level}
Skills: ${profile.skills.join(", ")}
Work history: ${JSON.stringify(profile.work_experience)}`;

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_object" },
  temperature: 0.4,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
```

**Dossier fields:**

| Field           | Type     | Purpose                                             |
| --------------- | -------- | --------------------------------------------------- |
| companyOverview | string   | What the company does                               |
| techStack       | string[] | Technologies they use                               |
| culture         | string[] | Values and working style                            |
| whyThisRole     | string   | Why this role exists                                |
| yourEdge        | string[] | Specific links between THIS candidate and this role |
| gapsToAddress   | string[] | Missing skills reframed as strategy                 |
| smartQuestions  | string[] | Questions that show real research                   |
| interviewPrep   | string[] | Topics to prepare for this role                     |
| sources         | string[] | Pages the company info came from                    |

**Rules:**

- Always use `extract()` with a Zod schema — never parse raw HTML or use regex
- Always wrap every `act()` and `extract()` in try/catch
- Always call `await stagehand.close()` when done — ends the Browserbase session
- Model is always `gpt-4o` — never use other models
- Temperature is `0.4` for synthesis — grounded but flexible enough to make real connections
- Max 3 sub-pages — never exceed this on free plan
- Always close session in finally block — never leave sessions open even if research fails
- Job description and profile always come from DB — never re-fetch via browser
- If browser research returns empty — still run synthesis with job + profile only
- yourEdge, gapsToAddress, and smartQuestions are the most valuable fields — never skip them

## OpenAI GPT-4o

**Check first:** Check AGENTS.md for an installed OpenAI skill. The skill will have the latest API patterns and model capabilities.

### Structured JSON Response

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_object" },
  temperature: 0.3,
  messages: [
    {
      role: "system",
      content: "You are a job matching assistant. Return only valid JSON.",
    },
    {
      role: "user",
      content: `Your prompt here`,
    },
  ],
});

const result = JSON.parse(response.choices[0].message.content!);
```

**Temperature settings:**

- `0.3` — matching, scoring, extraction, research synthesis — deterministic results
- `0.7` — resume generation — natural variation

**Max tokens:**

- Job matching + scoring: `300`
- Company research synthesis: `800`
- Resume generation: `1000`
- Profile extraction from resume: `800`

**Rules:**

- Model string is always `'gpt-4o'` — never use other model names
- Always use `response_format: { type: 'json_object' }` for structured data
- Always parse `response.choices[0].message.content` as string — even with json_object it returns a string
- Always validate parsed JSON before using — wrap in try/catch
- Match threshold is always `MATCH_THRESHOLD` from `lib/utils.ts` — never hardcode 70
- Company research synthesis must always return a complete dossier — never return empty even if browser research failed

---

## PostHog

**Check first:** Check AGENTS.md for an installed PostHog skill. If a PostHog MCP server is configured — use it. The skill/MCP will have the latest client and server patterns.

### Client Setup (Browser)

```typescript
// lib/posthog-client.ts
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined") {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      capture_pageview: false, // manual pageview tracking
    });
  }
}

// Capture event client-side
posthog.capture("job_found", {
  userId,
  source: "search",
  matchScore: score,
});
```

### Server Setup

```typescript
// lib/posthog-server.ts
import { PostHog } from "posthog-node";

export const createPostHogServer = () =>
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately
    flushInterval: 0, // no batching — Next.js functions are short-lived
  });

// Always use and shutdown in the same function
const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "company_researched",
  properties: { userId, jobId, company },
});
await posthog.shutdown(); // required — ensures event is sent
```

**Rules:**

- Always call `await posthog.shutdown()` in server-side functions — events are lost without it
- `flushAt: 1` and `flushInterval: 0` always set on server client
- Event names must match exactly the list in `code-standards.md`
- Always include `userId` as a property on every server-side event
- Call `posthog.identify(userId)` after login on client side
- Call `posthog.reset()` on logout on client side

---

## @react-pdf/renderer

**Check first:** Check AGENTS.md for an installed react-pdf skill. PDF generation APIs can differ from general training knowledge.

### Resume PDF Generation

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  section: { marginBottom: 10 },
  heading: { fontSize: 14, fontWeight: 'bold' },
  text: { fontSize: 10 },
})

const ResumePDF = ({ profile }: { profile: Profile }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>{profile.fullName}</Text>
        <Text style={styles.text}>{profile.email}</Text>
      </View>
    </Page>
  </Document>
)

// Generate buffer
const buffer = await renderToBuffer(<ResumePDF profile={profile} />)

// Upload directly to InsForge Storage
await insforge.storage
  .from('resumes')
  .upload(`${userId}/resume.pdf`, buffer, {
    contentType: 'application/pdf',
    upsert: true
  })
```

**Supported CSS properties:**
Only use these — others are silently ignored:
`padding, margin, fontSize, color, fontFamily, flexDirection, alignItems, justifyContent, borderRadius, width, height, fontWeight, textAlign, lineHeight`

**Rules:**

- Server-side only — never import in client components
- Always use `renderToBuffer` — not `renderToStream` or `PDFDownloadLink`
- PDF generation only in `app/api/resume/` routes
- Generated buffer uploaded directly to InsForge Storage — never written to disk
- Always save public URL to DB after upload

---

## pdf-parse

**Check first:** Check AGENTS.md for an installed pdf-parse skill.

### Extract Text from Uploaded Resume

```typescript
import pdf from "pdf-parse";

// In API route handling resume upload
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("resume") as File;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdfData = await pdf(buffer);
  const extractedText = pdfData.text; // raw text content

  // Send to GPT-4o for structured extraction
}
```

**Rules:**

- Server-side only — never import in client components
- `pdfData.text` is raw unformatted text — GPT-4o handles the structure extraction
- Always handle parse errors — some PDFs are image-based and return empty text
- If `pdfData.text` is empty or very short — return error to user: "Could not extract text from this PDF. Please try a different file."
