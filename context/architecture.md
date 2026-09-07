# Architecture

## Stack

| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Auth + DB + Storage + Realtime | InsForge                 | Entire backend                                   |
| Cloud browser                  | Browserbase              | Company research — browsing company public pages |
| AI browser control             | Stagehand                | Company page interaction and content extraction  |
| Job Discovery                  | Adzuna API               | Job search and discovery                         |
| AI model                       | OpenAI GPT-4o            | Matching, research synthesis, extraction         |
| Analytics                      | PostHog                  | Event tracking and dashboard charts              |
| PDF generation                 | @react-pdf/renderer      | Resume PDF rendering                             |
| Styling                        | Tailwind CSS + shadcn/ui | UI components and styling                        |
| Language                       | TypeScript strict        | Throughout                                       |

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── db/
│   └── schema.sql                          → Source of truth for the InsForge schema (run via run-raw-sql)
├── app/
│   ├── layout.tsx                          → Root layout, PostHog provider
│   ├── page.tsx                            → Homepage
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                   → Login page
│   │   └── callback/
│   │       └── route.ts                   → OAuth callback handler (Route Handler — sets httpOnly session cookies)
│   ├── (app)/                             → Route group: the signed-in shell. Adds no URL segment.
│   │   ├── layout.tsx                     → AppNavbar + page background, shared by all three app pages
│   │   ├── error.tsx                      → Client — error boundary for the signed-in pages
│   │   ├── dashboard/
│   │   │   └── page.tsx                   → Main dashboard
│   │   ├── profile/
│   │   │   └── page.tsx                   → Profile form + resume management
│   │   └── find-jobs/
│   │       ├── page.tsx                   → Find Jobs page — search controls + jobs list
│   │       └── [id]/
│   │           └── page.tsx               → Individual job details page
│   └── api/
│       ├── agent/
│       │   ├── find/route.ts              → Trigger Adzuna job discovery
│       │   └── research/route.ts          → Trigger company research agent
│       ├── resume/
│       │   ├── generate/route.ts          → Generate base resume PDF from profile
│       │   └── extract/route.ts           → Extract profile data from uploaded resume PDF
├── agent/
│   ├── adzuna.ts                          → Adzuna API job discovery + GPT-4o scoring
│   ├── research.ts                        → Company research — Browserbase + Stagehand + GPT-4o
│   ├── matcher.ts                         → GPT-4o job matching logic
│   ├── extractor.ts                       → GPT-4o job description extraction + structuring
│   └── types.ts                           → Agent-specific TypeScript types
├── actions/
│   ├── profile.ts                         → saveProfile + uploadResume Server Actions
│   └── jobs.ts                            → Job status updates
├── components/
│   ├── ui/                                → shadcn/ui components only
│   ├── layout/
│   │   ├── Navbar.tsx                     → Marketing navbar (homepage)
│   │   ├── AppNavbar.tsx                  → Signed-in navbar — icons + active underline, usePathname
│   │   ├── Logo.tsx
│   │   └── Footer.tsx
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AnalyticsCharts.tsx
│   ├── profile/
│   │   ├── ProfileForm.tsx                → Client — the five form sections, useActionState(saveProfile)
│   │   ├── ProfileAttentionBanner.tsx     → "Profile needs attention" card
│   │   ├── CompletionIndicator.tsx        → SVG completion ring
│   │   ├── ResumeUpload.tsx               → Client — dropzone uploads on file select, + Generate Resume row
│   │   ├── ResumePreview.tsx              → (not built — no design state for an uploaded resume yet)
│   │   ├── FormSection.tsx                → Divider + section heading + optional action
│   │   ├── FormField.tsx                  → Uppercase label + optional action + control
│   │   ├── TextInput.tsx                  → Shared input styling (incl. the nested variant)
│   │   ├── SelectInput.tsx                → Native select + chevron
│   │   ├── TagInput.tsx                   → Client — skills / industries chips
│   │   └── WorkExperienceList.tsx         → Client — up to 3 roles, Add role
│   ├── find-jobs/
│   │   ├── SearchControls.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobFilters.tsx
│   │   └── JobsPagination.tsx
│   └── job-details/
│       ├── JobInfo.tsx
│       ├── MatchScore.tsx
│       ├── JobDescription.tsx
│       ├── CompanyResearch.tsx
│       └── JobActions.tsx
├── lib/
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client
│   ├── browserbase.ts                     → Browserbase session creation + management
│   ├── stagehand.ts                       → Stagehand initialisation with Browserbase session
│   ├── adzuna.ts                          → Adzuna API client
│   ├── posthog-client.ts                  → PostHog browser client
│   ├── posthog-server.ts                  → PostHog server client
│   ├── profile.ts                         → getCurrentProfile() — session user's row, jsonb normalised
│   ├── profile-completion.ts              → Completion % + missing-field labels
│   ├── profile-form.ts                    → Zod schema + FormData reader for the profile form
│   ├── analytics.ts                       → Server-side PostHog event helpers
│   ├── profile-options.ts                 → Dropdown values + labels, shared by the form and the schema
│   └── utils.ts                           → Shared constants (resume upload limits + messages)
└── types/
    └── index.ts                           → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`        | Pages and API routes only. No business logic.                                                          |
| `agent/`      | All agent logic. Adzuna discovery, company research, matching, extraction. Nothing here touches React. |
| `actions/`    | Server Actions for UI-triggered mutations only. Profile save, profile update.                          |
| `components/` | UI only. No data fetching logic. No direct DB calls.                                                   |
| `lib/`        | Third party client initialisation, shared utilities, and session-scoped read helpers (`getCurrentProfile`, `getPrimaryCta`). Reads only — every write goes through `actions/` or `agent/`. |
| `types/`      | TypeScript types shared across the project.                                                            |

---

## Data Flow

### UI Mutations (Server Actions)

```
User interaction in component
        ↓
Server Action in actions/
        ↓
InsForge DB write
        ↓
Revalidate or redirect
```

### Agent Operations (API Routes)

```
User clicks Find Jobs
        ↓
API route in app/api/agent/find
        ↓
Calls agent/adzuna.ts
        ↓
Adzuna API returns job listings
        ↓
GPT-4o scores each job against user profile
        ↓
Agent writes results to InsForge DB
        ↓
Page data revalidated
```

### Company Research (API Routes)

```
User clicks Research Company on job details page
        ↓
API route in app/api/agent/research
        ↓
Calls agent/research.ts
        ↓
Single Browserbase session opens with Stagehand
        ↓
Navigates to company homepage + sub pages
        ↓
GPT-4o synthesizes dossier from extracted content
        ↓
Dossier saved to jobs.company_research
        ↓
Page data revalidated
```

### Resume Operations (API Routes)

```
User uploads resume or clicks Generate
        ↓
API route in app/api/resume/
        ↓
GPT-4o processes content
        ↓
@react-pdf/renderer renders PDF buffer
        ↓
New PDF uploaded to InsForge Storage
        ↓
URL saved to profiles table
```

---

## InsForge Database Schema

### `profiles`

| Column              | Type        | Notes                                        |
| ------------------- | ----------- | -------------------------------------------- |
| id                  | uuid        | References auth.users                        |
| full_name           | text        |                                              |
| email               | text        | Pre-filled from auth                         |
| phone               | text        |                                              |
| location            | text        | City, country                                |
| current_title       | text        | Most recent job title                        |
| experience_level    | text        | junior / mid / senior / lead                 |
| years_experience    | integer     |                                              |
| skills              | text[]      | Array of skill tags                          |
| industries          | text[]      | Industries worked in                         |
| work_experience     | jsonb       | Array of up to 3 roles                       |
| education           | jsonb       | Degree, field, institution, year             |
| job_titles_seeking  | text[]      | Roles they want                              |
| remote_preference   | text        | remote / onsite / hybrid / any               |
| preferred_locations | text[]      | Optional preferred locations                 |
| salary_expectation  | text        | Optional                                     |
| cover_letter_tone   | text        | formal / casual / enthusiastic               |
| linkedin_url        | text        |                                              |
| portfolio_url       | text        |                                              |
| work_authorization  | text        | citizen / permanent_resident / visa_required |
| resume_pdf_url      | text        | InsForge Storage URL of current resume       |
| is_complete         | boolean     | True when all required fields filled *now*   |
| profile_completed_at| timestamptz | First time the profile was ever complete — gates the one-shot `profile_completed` event |
| created_at          | timestamptz |                                              |
| updated_at          | timestamptz |                                              |

### `agent_runs`

| Column             | Type        | Notes                        |
| ------------------ | ----------- | ---------------------------- |
| id                 | uuid        |                              |
| user_id            | uuid        | References profiles          |
| status             | text        | running / completed / failed |
| job_title_searched | text        |                              |
| location_searched  | text        |                              |
| jobs_found         | integer     | Total jobs discovered        |
| started_at         | timestamptz |                              |
| completed_at       | timestamptz |                              |

### `jobs`

| Column             | Type        | Notes                                          |
| ------------------ | ----------- | ---------------------------------------------- |
| id                 | uuid        |                                                |
| run_id             | uuid        | References agent_runs — null if from URL input |
| user_id            | uuid        | References profiles                            |
| source             | text        | search / url                                   |
| source_url         | text        | Original job listing URL                       |
| external_apply_url | text        | Direct company apply URL                       |
| title              | text        |                                                |
| company            | text        |                                                |
| location           | text        |                                                |
| salary             | text        | If available                                   |
| job_type           | text        | fulltime / parttime / contract                 |
| about_role         | text        | 2-3 sentence summary                           |
| responsibilities   | text[]      | Bullet points                                  |
| requirements       | text[]      | Bullet points                                  |
| nice_to_have       | text[]      | Optional                                       |
| benefits           | text[]      | Optional                                       |
| about_company      | text        | Brief company description                      |
| match_score        | integer     | 0-100 scored against main profile              |
| match_reason       | text        | GPT-4o explanation                             |
| matched_skills     | text[]      | Skills user has that match                     |
| missing_skills     | text[]      | Skills user lacks                              |
| company_research   | jsonb       | Company dossier from research agent            |
| found_at           | timestamptz |                                                |

### `agent_logs`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        |                                  |
| run_id     | uuid        | References agent_runs            |
| user_id    | uuid        | References profiles              |
| message    | text        | Human readable log entry         |
| level      | text        | info / success / warning / error |
| job_id     | uuid        | Optional — related job           |
| created_at | timestamptz |                                  |

---

## InsForge Storage

| Bucket  | Path                         | Contents                  |
| ------- | ---------------------------- | ------------------------- |
| resumes | resumes/{user_id}/resume.pdf | Current active resume PDF |

Access: authenticated users only, own files only.

---

## Authentication

- Provider: InsForge Auth
- Methods: Google OAuth, GitHub OAuth
- Protected routes: /dashboard, /profile, /find-jobs, /find-jobs/[id]
- Public routes: /, /login
- `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, exported function `proxy`) checks session on every protected route
- On login → redirect to /dashboard

---

## InsForge Client Pattern

There is no standalone `@insforge/ssr` package — the SSR helpers ship as a
subpath of `@insforge/sdk` (`@insforge/sdk/ssr`, `@insforge/sdk/ssr/middleware`).
Confirmed against the installed package's `SDK-REFERENCE.md` and `.d.ts` files
during feature 02 Auth. Two separate InsForge instances — never mix them:

```typescript
// lib/insforge-client.ts
// Browser-side — used in client components for auth state.
// Its auth surface is intentionally read-only (getCurrentUser, getProfile,
// getPublicAuthConfig) — the refresh token lives in an httpOnly cookie the
// browser client never touches. Sign-in/out/OAuth run server-side only.
import { createBrowserClient } from "@insforge/sdk/ssr";
export const insforge = createBrowserClient();
// Reads NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY automatically.

// lib/insforge-server.ts
// Server-side — used in Server Components, API routes, Server Actions, agent code
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({
    cookies: await cookies(),
  });
};
```

OAuth sign-in and code exchange never use `createServerClient()` — they use
`createAuthActions()` from the same `@insforge/sdk/ssr` entrypoint, which can
write cookies. See the **Authentication** section of `library-docs.md` for the
full sign-in → callback pattern.

---

## InsForge Database & RLS Pattern

`db/schema.sql` is the source of truth for the schema. It is executed with the
InsForge `run-raw-sql` MCP tool (which connects as `project_admin`) and every
statement in it is idempotent, so it can be re-run safely. Never change the
schema only on the backend — change the file and re-run it.

**RLS is load-bearing, not defence in depth.** InsForge default privileges
(`pg_default_acl`) automatically grant **both `anon` and `authenticated` full
CRUD** on every new table in `public`. A table created without RLS is readable
and writable by any unauthenticated caller holding the publishable anon key.
Every table added here must therefore:

```sql
alter table public.<name> enable row level security;   -- enable, never force

create policy <name>_owner on public.<name>
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.<name> from anon;
```

- `auth.uid()` reads `request.jwt.claims ->> 'sub'` — the access token's user id.
  `auth.jwt()` and `auth.role()` are also available.
- **`enable`, never `force`.** Forcing would apply policies to `project_admin`
  too, breaking the signup trigger and the InsForge admin tooling.
- `profiles` is scoped on `id` (its primary key *is* the auth user id); every
  other table is scoped on `user_id`.
- Access tokens are short — **15 minutes**. Anything longer-running than that
  cannot assume the caller's token is still valid.

**Profile provisioning.** `public.handle_new_user()` is a `SECURITY DEFINER`
trigger on `auth.users` that inserts a `profiles` row at signup, copying `id`,
`email`, and `full_name` from `auth.users.profile ->> 'name'`. Every user is
guaranteed exactly one profile row, so no feature needs to handle "no row yet".
`authenticated` cannot select `auth.users` through PostgREST, which is why email
and name are copied into `profiles` rather than joined at read time.

**Reading and writing `profiles`.** Queries go through `insforge.database.from(...)`
— not `insforge.from(...)`, which does not exist. Two columns are `jsonb not null`
with defaults (`work_experience` `'[]'`, `education` `'{}'`), so an untouched
profile reads back as an empty array/object rather than null; `lib/profile.ts`
normalises that at the read boundary so the rest of the app can trust the
`Profile` type. An update that must match exactly one row chains
`.select("id").single()` — PostgREST reports neither rows nor an error for an
update that matched nothing.

**Enum-like columns.** CHECK constraints are applied only where our own code
controls the value: `jobs.source`, `agent_runs.status`, `agent_logs.level`, plus
range checks on `jobs.match_score` and `agent_runs.jobs_found`. Columns written
by GPT-4o extraction or user dropdowns — `profiles.experience_level`,
`remote_preference`, `work_authorization`, `cover_letter_tone`, and
`jobs.job_type` — stay plain `text` and are validated in the app's Zod layer, so
a stray model output is a validation error rather than a 500.

---

## Browserbase Session Pattern

```typescript
// Company research session — single session, sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

---

## Job Discovery Pattern

**Adzuna API — job search**

```typescript
const response = await fetch(
  `https://api.adzuna.com/v1/api/jobs/us/search/1?` +
    `app_id=${process.env.ADZUNA_APP_ID}&` +
    `app_key=${process.env.ADZUNA_APP_KEY}&` +
    `what=${encodeURIComponent(jobTitle)}&` +
    `where=${encodeURIComponent(location)}&` +
    `category=it-jobs&` +
    `results_per_page=10&` +
    `content-type=application/json`,
);
const data = await response.json();
// data.results — array of job listings
// Each job: title, company.display_name, location.display_name,
//           salary_min, salary_max, description, redirect_url, created
```

---

## Company Research Pattern

```typescript
// Single session — visits company homepage and sub pages sequentially
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  browserbaseSessionID: session.id,
  modelName: "gpt-4o",
  modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
});

await stagehand.init();
const page = stagehand.page;

// Clean company name and construct homepage URL
const cleanName = companyName
  .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?).*$/i, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "");

const homepageUrl = `https://www.${cleanName}.com`;

// Navigate and extract — graceful fallback if page not found
try {
  await page.goto(homepageUrl);
  await page.waitForLoadState("networkidle");
  const content = await stagehand.extract({ instruction: "..." });
} catch (error) {
  // Log and continue — GPT-4o will synthesize from what was found
  await logAgentError(jobId, error);
}

// Always close session when done
await stagehand.close();
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions. Agent functions are only called from API routes.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- No hardcoded hex values or raw Tailwind color classes in components — use CSS variables from ui-tokens.md.
- Every Stagehand action is wrapped in try/catch. Failures are logged to agent_logs, never thrown to crash the run.
- Company research always returns a dossier — even if browser research fails, GPT-4o synthesizes from company name and job description alone. Never return empty.
- Browserbase sessions are always closed with stagehand.close() when done — never leave sessions open.
- Always scope InsForge queries to the current user_id — never query without a user filter.
- Adzuna API always includes category=it-jobs — never search without this filter.
- jobs.source is always 'search' or 'url' — never any other value.
