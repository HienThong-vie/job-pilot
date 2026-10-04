# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 08 Resume PDF Generation from Profile — a Generate button builds a clean single-page PDF from the saved profile, GPT-4o writing only the summary and the per-role bullets, and replaces the resume on file after a confirm step. **Verified end to end 2026-10-04** against a production build with a real session: happy path, incomplete-profile 422, missing-key handling and the Extract round trip all pass, and `@react-pdf/renderer` needs no `serverExternalPackages` entry. One check is unrun (first generation with `resume_pdf_url` null — no UI path to null the column and the InsForge MCP server was down), and three findings are open — see the end of the 08 entry.
**Previously:** 07 AI Profile Extraction from Resume — an Extract from Resume button reads the PDF already in storage, GPT-4o (via OpenRouter) returns structured JSON, and the form repopulates without anything being written to the database. Verified end to end against the live backend with a real Google session and a real resume.
**Next:** 09 Find Jobs Page — Full UI

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI
- [x] 06 Profile Save Logic
- [x] 07 AI Profile Extraction from Resume
- [x] 08 Resume PDF Generation from Profile — verified 2026-10-04 against a real session; one check (first generation with `resume_pdf_url` null) still unrun, blocked on DB access

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Decisions Made During Build

**01 Homepage**

- **Design measured, not eyeballed** — every section boundary, type size and colour was sampled from `landing-page.png` (a 5792px export of a 1440px canvas, scale 4.022, with a 4px black frame on the left/right edges that must be subtracted). Rendered output matches the design within ~5px on every section boundary and every line break.
- **Page shell** — 1280px column inside a 1440px page (`px-20` + `border-x`). The vertical column rules start *below* the navbar, not at the top of the page.
- **Marketing type scale differs from ui-tokens.md**, which describes the in-app UI: hero 64/72, CTA 56/58, section headings 44/50, feature titles 20/28, feature body 17.5/30, nav and footer links 15px. The navbar is 80px tall here, not the 64px in ui-rules.md.
- **Marketing CTAs are dark, not purple** — `bg-text-slate` with a 10%→0% white top gradient. `bg-accent` stays reserved for in-app primary actions.
- **Feature items are fixed-height centred blocks** (153px), not padding-driven. That is how the design keeps a three-line item the same height as a two-line one.
- **Body copy set at 17.5px** — Inter renders ~3.5% narrower than the design's face, and 17.5px is what reproduces the designed line breaks. Heading breaks are explicit `<br />`.
- **New tokens** — `--color-accent-deep` (#4A2EC5, the logo gradient end from ui-tokens.md), plus `--color-mesh-base`, `--color-mesh-lilac`, `--color-mesh-blue`, `--color-mesh-pink` and `--color-hatch` for the decorative panels.
- **New utilities in globals.css** — `mesh-hero`, `mesh-cta` (layered radial-gradient meshes) and `hatch-band` (45° 1px stripes). Written as `@utility` so the colours stay in the token file and components keep using plain Tailwind classes.
- **`lucide-react` installed** (on the approved list in code-standards.md) for the `Play` glyph in the CTA buttons. The logo mark is an inline SVG rather than `public/logo.png` so it can use the gradient tokens.
- **Deviation from architecture.md** — `components/homepage/` holds `Hero`, `DashboardPreview`, `FeatureSection`, `Testimonial`, `CallToAction` and `HeroActions` instead of the listed `Hero`/`HowItWorks`/`Features`. The design has no "How It Works" section and two mirrored feature sections, so one reusable `FeatureSection` covers both.
- **CTAs link to `/login`** — build-plan 01 wants auth-aware routing, which lands with feature 02.

**01 Homepage — responsive pass**

- Mobile-first breakpoints layered onto the 1440px design; verified at 360, 414, 768, 1024 and 1440 with `scrollWidth === clientWidth` at every width.
- **Column rules now wrap only Hero→CallToAction.** The spacer above the hero and the trailing hatch band plus footer sit outside the `border-x` wrapper, so no vertical rules dangle at the top or bottom of the page.
- **Images inside flex/grid parents need `min-w-0`.** Without it a replaced element's automatic minimum size (its intrinsic width, clamped by `max-width`) becomes a hard floor and overflows narrow viewports.
- **Designed line breaks and fixed heights are `lg`-only** so small screens flow naturally instead of clipping.
- Navbar below `md` uses a `<details>`/`<summary>` disclosure — no JS, stays a Server Component.
- **Testing note:** headless Chrome on this machine clamps `--window-size` to a ~500px CSS floor, so narrow screenshots look falsely cropped. Verify mobile by loading the page in same-origin iframes of a fixed width, not by shrinking the window.

**01 Homepage — `/review` fixes**

- **Raw Tailwind color removed.** `HeroActions` used `from-white/10`, `to-white/0` and `text-white/55` — all raw palette classes, against the never-changes rule. Replaced with `accent-foreground/10`, `/0` and `/55`; `--color-accent-foreground` is already `#ffffff`, so the render is pixel-identical, just token-backed.
- **`sizes` added to every CSS-responsive image.** `DashboardPreview` and both `FeatureSection` images render at fluid widths (`w-full max-w-[…]`) but had no `sizes` prop — per Next's own image docs, that makes the browser assume 100vw and request an oversized file at every breakpoint. `FeatureSection` now takes a required `imageSizes` prop; both call sites in `app/page.tsx` pass one matching their `imageClassName` (`"(min-width: 1024px) 584px, 100vw"` / `"532px"`). `DashboardPreview`'s is fixed inline at `"(min-width: 1024px) 1191px, 100vw"`. The testimonial avatar needed no change — it's a genuinely fixed 48×48px image, not CSS-responsive.
- **`PRIMARY_CTA_HREF` added to `lib/utils.ts`.** The auth-aware CTA routing build-plan 01 asks for (`/dashboard` if logged in, `/login` otherwise) can't be built correctly yet — no InsForge client or session helper exists, that infrastructure is feature 02. Asked the user whether to scaffold InsForge now or defer; got no response, so took the safer default: both CTAs still resolve to `/login` (correct for a logged-out visitor), but now import one shared constant instead of each hardcoding the string. When feature 02 lands, this becomes a one-line change in `lib/utils.ts` instead of a hunt across components. **This item is still open** — revisit once `lib/insforge-server.ts` exists.

**Tailwind v4 token setup (`app/globals.css`)**

- **Source scope** — the git root is `D:/Code/IDE files/Visual files`, the parent folder holding 9 unrelated projects. Tailwind v4 auto-detects sources by walking up to the git root, so it scanned all of them (compile hung past 2 min). Fixed with `@import "tailwindcss" source("../")` to pin the base path to the Job Pilot root. Compile is now 0.55s.
- **Docs excluded from scanning** — `@source not` on `context/`, `.claude/`, `.agents/`. Those markdown files contain example class names (`bg-blue-500`, `text-gray-600`) that Tailwind was emitting as real utilities. Bundle dropped 57.8KB to 5.1KB.
- **`--font-sans` indirection** — declared as `var(--font-inter), "Inter", sans-serif` rather than the literal `"Inter", sans-serif` in ui-tokens.md. next/font self-hosts under a generated family name, so a literal `"Inter"` only resolves if the user has Inter installed locally. Root layout must therefore use `Inter({ subsets: ["latin"], variable: "--font-inter" })`, not `variable: "--font-sans"` as written in ui-rules.md — that form collides with the `@theme` declaration on `:root` at equal specificity.
- **`--color-chart-axis: #9ca3af`** — new token. ui-tokens.md specifies this value for chart axis labels but gives it no variable name, and the no-hex-in-components invariant needs one. Every other chart color already maps to an existing token (line `accent`, bars `info` / `success`, grid `border`).
- **Cards use `shadow-sm`** — v4.3.3's default `--shadow-sm` is byte-identical to the card shadow in ui-rules.md. No custom shadow token needed.
- **Default border colour** — v4 defaults every border to `currentColor`. A base-layer override sets it to `var(--color-border)` so a bare `className="border"` satisfies the ui-rules invariant.
- **No custom type scale** — the design's sizes map exactly onto Tailwind defaults, line heights included: 12/16 `text-xs`, 14/20 `text-sm`, 16/24 `text-base`, 30/36 `text-3xl`. Only the 19px logo is off-scale.

**02 Auth**

- **`@insforge/ssr` does not exist as a package — it's a subpath of `@insforge/sdk`.** `architecture.md`, `library-docs.md`, and `code-standards.md` all referenced a standalone `@insforge/ssr` package with a Supabase-style `getAll`/`setAll` cookie adapter and `auth.getUser()`. That package returns a 404 on npm. The real SSR surface ships inside `@insforge/sdk` (currently 1.5.2) as `@insforge/sdk/ssr` and `@insforge/sdk/ssr/middleware`, confirmed by reading the installed package's `.d.ts` files and its bundled `SDK-REFERENCE.md`. All three context files have been corrected to match. Any future session trusting the old snippets verbatim would fail at `npm install`.
- **The real SSR auth API is meaningfully different from the docs' assumption.** `createBrowserClient()`'s `auth` is intentionally restricted to `getCurrentUser`, `getProfile`, `getPublicAuthConfig` — no `signInWithOAuth`/`signOut` from the browser, because the refresh token lives in an httpOnly cookie the browser can't touch. OAuth sign-in and code exchange must run server-side via `createAuthActions()` (Server Actions / Route Handlers). See the corrected **Authentication** section in `library-docs.md` for the full pattern.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts` (exported function `proxy`, not `middleware`).** This project is on Next 16.3.4. Confirmed against `node_modules/next/dist/docs/.../file-conventions/proxy.md` — `middleware.ts` is deprecated, not just renamed cosmetically; the old filename is silently ignored (no error, no route protection) rather than erroring, which would have been a silent auth bypass if missed. `architecture.md`'s Authentication section is corrected to say `proxy.ts`.
- **OAuth flow implemented:** `actions/auth.ts` (`signInWithOAuthAction`) calls `createAuthActions().signInWithOAuth(provider, { redirectTo, skipBrowserRedirect: true })`, stashes the PKCE `codeVerifier` in a short-lived httpOnly cookie, then `redirect()`s to the provider. `app/(auth)/callback/route.ts` — a Route Handler, not the `page.tsx` architecture.md originally specified, since only a Route Handler can set the httpOnly session cookies via `Set-Cookie` — reads `insforge_code` and the stashed verifier, calls `exchangeOAuthCode()`, and redirects to `/dashboard` (or `/login?error=oauth_failed`).
- **Verified end-to-end with Playwright against the real InsForge backend** (not mocked): both login buttons produce genuine redirects to `accounts.google.com` and `github.com/login` with real client IDs embedded in the OAuth URL. Confirms the InsForge dashboard already has both providers configured. Full login completion wasn't tested (needs a real provider account), but the entire chain up to the provider's consent screen is confirmed working.
- **Known gap — `allowedRedirectUrls` is empty on the InsForge backend.** The final hop of the OAuth flow (InsForge redirecting back to `http://localhost:3000/callback` after the provider completes) will be rejected until someone adds that URL (and the prod equivalent) to `allowedRedirectUrls` in the InsForge dashboard. No MCP tool exposes this setting — it's dashboard-only. **This blocks a real end-to-end login test until fixed.**
- **`lib/utils.ts` emptied** — the `PRIMARY_CTA_HREF` constant (a static `/login`, flagged as a stopgap in the 01 Homepage notes) is replaced by `getPrimaryCtaHref()` in `lib/insforge-server.ts`, which checks the real session via `getCurrentUser()`. `Navbar` and `HeroActions` are now `async` Server Components. `lib/utils.ts` is empty until `MATCH_THRESHOLD` lands in a later feature.
**02 Auth — `/review` fixes**

- **CTA copy now matches session state.** `getPrimaryCtaHref()` was replaced with `getPrimaryCta(loggedOutLabel)` in `lib/insforge-server.ts`, returning `{ href, label }`. An authenticated visitor now sees "Go to Dashboard" instead of "Start for free" / "Get Started" on the navbar and homepage hero — the href was already session-aware from the original build, only the label was stale.
- **Login page's GitHub button switched from `bg-text-slate` to `bg-accent`.** The dark slate fill is documented in this file's own homepage entry as a marketing-page-only choice; the login page is an app route, so it takes the in-app Primary button token per `ui-tokens.md` instead.
- **`proxy.ts` protected-path list de-duplicated.** `PROTECTED_PATHS` is now derived from `config.matcher` (stripping the `/:path*` suffix) instead of being hand-maintained separately — `config.matcher` itself is still a literal array, since Next only statically analyzes literal matcher values at build time and silently ignores anything computed. One list to update, not two that can drift apart.
- **`secure` added to the PKCE `codeVerifier` cookie** in `actions/auth.ts`, gated on `NODE_ENV === "production"` so local dev over HTTP still works.
- **OAuth buttons show a pending state.** New `components/auth/SubmitButton.tsx` (client component, `useFormStatus()`) swaps the button label for a spinner and disables the button while the Server Action is in flight — `useFormStatus` has to run in a child of the `<form>`, so this couldn't live in `OAuthButton` itself.
- **Explicit return types added** to `proxy()`, `createInsforgeServer()` (now typed `Promise<InsForgeClient>`, imported from `@insforge/sdk`), and the callback route's `GET()`.
- **`code-standards.md` now documents the redirect-only exception** for Server Actions and Route Handlers directly (previously only `library-docs.md` explained it) — `signInWithOAuthAction` and the callback route both redirect instead of returning `{success, error}`, and that's now written into the standard itself, not just the library notes.
- **Still open:** `allowedRedirectUrls` on the InsForge backend — not something this pass could touch (dashboard-only, no MCP tool exposes it). Full login completion is still unverified past the provider's consent screen.

- **Login page has no delivered design asset** (unlike every other page, which has a PNG in `context/designs/`). Built from `ui-tokens.md`/`ui-rules.md` conventions directly: centered card (`bg-surface`, `border-border`, `rounded-2xl`, `shadow-sm`), stacked full-width OAuth buttons — white/bordered for Google, `bg-text-slate` dark fill for GitHub, matching the navbar CTA fill. No Google/GitHub brand icons exist in `lucide-react` (checked — only generic `Git*` icons), so both use inline SVGs, consistent with how `Logo.tsx` already handles the one other brand mark on the site.

**03 PostHog Initialization**

- **Init lives in `instrumentation-client.ts` (repo root), not a layout provider.** `library-docs.md`/`build-plan.md` predate Next 15.3's `instrumentation-client` convention and describe initializing in the root layout. On Next 16.3.4 the file convention is the documented approach (`node_modules/next/dist/docs/.../instrumentation-client.md`) and avoids turning `app/layout.tsx` into a Client Component — same rule the auth work already followed (docs corrected for real Next 16). `lib/posthog-client.ts` still exists exactly as `library-docs.md` specifies; `instrumentation-client.ts` just calls its `initPostHog()`.
- **Env var names match `code-standards.md`:** `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` (host `https://us.i.posthog.com`). Both added to `.env.local`.
- **Missing key fails loudly in dev, no-ops in prod** — per the PostHog framework rules. `initPostHog()` / `createPostHogServer()` throw the prescribed message when `NEXT_PUBLIC_POSTHOG_KEY` is unset and `NODE_ENV !== "production"`, otherwise return without initializing.
- **Reverse proxy added to `next.config.ts`** — `/ingest/*` rewrites to `us.i.posthog.com` (and `/ingest/static`, `/ingest/array` to `us-assets.i.posthog.com`), `skipTrailingSlashRedirect: true`. `posthog.init` uses `api_host: "/ingest"`, `ui_host` = the real host. `proxy.ts`'s matcher doesn't touch `/ingest`, so no auth interference.
- **`defaults: "2025-05-24"`** on `posthog.init` (valid `ConfigDefaults` value in posthog-js 1.427.2) — modern autocapture + pageview/pageleave behaviour without hand-configuring each flag. `capture_exceptions: true` client-side.
- **identify() + `reset()` split from the client.** `build-plan.md` 03 wants both called client-side. There is no post-login Client Component and no logout UI yet (still true — see note below), so identity is established **server-side** via `trackServerSignIn()` in `lib/analytics.ts`, called from `app/(auth)/callback/route.ts` on a successful `exchangeOAuthCode`: `identify({ distinctId: user.id, properties: { email, name } })` then `capture({ event: "signed_in", ... })` then `await posthog.shutdown()`. The whole helper is wrapped in one try/catch — analytics (including a missing-key throw in dev) never breaks the auth redirect.
- **Client/server distinct-ID correlation is not wired yet.** `sign_in_started` (client, `components/auth/OAuthButton.tsx` — now `"use client"`) fires on the anonymous ID; `signed_in` (server) fires on `user.id`. They merge on the person once the same `user.id` is `identify()`d, but a browser that never calls client-side `identify()` will keep anonymous client events separate. Proper fix (tracing headers / `X-POSTHOG-DISTINCT-ID`) belongs with the first authenticated Client Component.
- **Two new event names added to `code-standards.md`** (`sign_in_started`, `signed_in`) — the table said "four events only", so the list was updated first per the rule.
- **Still open:** client-side `identify()` on page refresh for an already-logged-in user, and `posthog.reset()` on logout — both need UI that doesn't exist yet (no dashboard, no sign-out affordance). Carry into the first feature that adds an authenticated Client Component.

**03 PostHog Initialization — `/review` fixes**

- **`enableExceptionAutocapture: true` removed from `lib/posthog-server.ts`.** That client is created per request and `shutdown()` immediately, but posthog-node's `errorTracking.shutdown()` never removes the `process.on('uncaughtException' / 'unhandledRejection')` listeners it installs (verified in `node_modules/posthog-node/dist/extensions/error-tracking/index.js`). Every sign-in would leak two listeners bound to a dead client. Server-side exception capture, if wanted later, needs a singleton client created once at process start — not this one.
- **Analytics moved out of the callback route into `lib/analytics.ts` (`trackServerSignIn`).** Keeps the redirect-only route handler thin, and — critically — `createPostHogServer()` is now called *inside* the helper's try/catch. Previously it sat outside the inner try, so in dev with no PostHog key its loud throw was caught by the callback's outer catch and bounced a successfully-authenticated user to `/login?error=oauth_failed`.
- **`isNewUser` property dropped from `signed_in`.** It was `Date.now() - createdAt < 60s`, but the OAuth consent round-trip routinely exceeds 60s for a real new user, so genuine signups were mislabelled. No reliable first-login signal is available from the exchange response.
- **`provider` on `signed_in` is now accurate.** Was `user.providers?.at(-1)` (last-linked provider ≠ provider used this session). The server action now writes an `insforge_oauth_provider` httpOnly cookie alongside the PKCE `codeVerifier` cookie (shared `oauthCookieOptions`, 600s); the callback reads it, passes it to `trackServerSignIn`, then deletes it.
- **`ui_host`** now `host?.replace(".i.posthog.com", ".posthog.com")` → `https://us.posthog.com` (the app host, for "open in PostHog"/toolbar links), not the ingestion host.
- **`code-standards.md` event table updated** — `signed_in` key properties are now `userId, method, provider` (no `isNewUser`).
- Build + `tsc --noEmit` + `eslint` all clean after the fixes.

**04 Database Schema**

- **RLS is the only thing protecting the data, not defence in depth.** InsForge default privileges (`pg_default_acl`) auto-grant **both `anon` and `authenticated` full CRUD** on every new table in `public`. A table created here without RLS is world-readable and world-writable by anyone holding the publishable anon key. All four tables therefore get `enable row level security` + a `for all to authenticated using (<owner> = auth.uid()) with check (...)` policy, and `anon` is explicitly revoked on top. This is the single most important fact about this backend — it is now written into `architecture.md` as a rule for every future table.
- **`enable row level security`, never `force`.** Forcing would apply the policies to `project_admin` as well, breaking both the `SECURITY DEFINER` signup trigger and the InsForge admin MCP tooling (`get-table-schema`, `run-raw-sql`), which rely on the owner's RLS bypass.
- **InsForge is Supabase-shaped.** Confirmed by introspection: `auth.uid()` / `auth.jwt()` / `auth.role()` all read `request.jwt.claims`; roles are `anon` / `authenticated` / `project_admin` (bypassrls) / `postgres`. `run-raw-sql` connects as `project_admin`, so it owns what it creates and can enable RLS and author policies. PostgREST schema exposure is auto-synced by an event trigger (`insforge_sync_postgrest_schemas`) — no manual config needed after a `create table`.
- **`SET ROLE` is blocked by the `run-raw-sql` MCP tool**, so RLS could not be tested by impersonation. Tested over real HTTP instead — see the verification note below. Worth remembering for any future policy work.
- **Signup trigger provisions `profiles`.** `public.handle_new_user()` — `SECURITY DEFINER`, pinned `search_path`, skips `is_anonymous` users, `on conflict (id) do nothing` — fires `after insert on auth.users` and copies `id`, `email`, and `full_name` from `auth.users.profile ->> 'name'`. Chosen over a lazy upsert in feature 06 because the schema already assumes a profile row exists; this removes "no row yet" handling from features 05–08, 15 and 16, and `authenticated` cannot select `auth.users` through PostgREST so email/name have to be copied in regardless. Confirmed against the real auth API that InsForge stores the signup name at `profile ->> 'name'`. A one-time backfill gave the one pre-existing account (the project owner) its row; `full_name` is null there because the backfill only copies id and email.
- **Access tokens live 15 minutes** (measured `exp - iat` on a real token). Shorter than assumed. Fine for a 2-minute Browserbase research session, but nothing longer-running can assume the caller's token is still valid.
- **CHECK constraints only where our own code controls the value** — `jobs.source in ('search','url')`, `agent_runs.status`, `agent_logs.level`, `jobs.match_score between 0 and 100`, `agent_runs.jobs_found >= 0`. Deliberately **not** applied to `profiles.experience_level` / `remote_preference` / `work_authorization` / `cover_letter_tone` or `jobs.job_type`, which are populated by GPT-4o extraction (feature 07) or user dropdowns — a stray `"mid-level"` should be a Zod validation error, not a 500 at save time. `jobs.job_type` is the clearest case: `library-docs.md` maps Adzuna's `contract_type || 'fulltime'`, but Adzuna actually returns `"permanent"`, so a CHECK there would fail on real data.
- **FK cascade design.** `profiles.id → auth.users on delete cascade`; the three `user_id` columns → `profiles(id) on delete cascade` (as `architecture.md` specifies — safe now that the trigger guarantees a profile row exists); `jobs.run_id → agent_runs on delete set null` (null is already a valid steady state for URL-sourced jobs, and the jobs are worth more than the run record); `agent_logs.run_id → agent_runs on delete cascade` (a log line is meaningless without its run); `agent_logs.job_id → jobs on delete set null`.
- **Indexes lead with `user_id`** so one composite serves both the plain user filter and the sort: `agent_runs (user_id, started_at desc)`, `jobs (user_id, found_at desc)`, `jobs (user_id, match_score desc)`, plus plain FK indexes on `jobs.run_id`, `agent_logs.run_id`, `agent_logs.user_id`, `agent_logs.job_id`. Postgres does not index foreign keys automatically and the referencing side of every cascade needs one. The two `jobs` sort composites are slightly ahead of feature 11, but its query shapes are already documented in `build-plan.md`.
- **Deviation from `architecture.md`'s folder structure — new `db/` folder.** `db/schema.sql` holds the full idempotent DDL and is the source of truth; the backend is never edited directly. `architecture.md`'s folder structure and a new "InsForge Database & RLS Pattern" section have been updated to match.
- **`resumes` bucket created private** (`isPublic: false`), matching "authenticated users only, own files only". Consequence recorded in `library-docs.md`: the installed SDK has no `getPublicUrl` (its storage surface is `upload` / `uploadAuto` / `download` / `remove`), so reading a resume back needs a server route calling `storage.download(key)`, and `profiles.resume_pdf_url` will in practice hold the object key. InsForge's own per-object "own files only" enforcement is **unverified** — feature 06/08 must scope every storage path by the session user id server-side rather than relying on it.

**04 Database Schema — verification**

Tested against the live backend over real HTTP, not just introspected:

- Unauthenticated caller with the real anon key → `401 / 42501 permission denied` on all four tables, for both select and insert.
- Real user registered through `POST /api/auth/users` → `profiles` row auto-created with the correct `full_name`. This proved the trigger against the real auth flow, not just a synthetic insert.
- Authenticated caller (real 15-minute JWT, `role: authenticated`) → sees only their own rows (1 of 2 jobs, 1 of 4 profiles); an explicit query for another user's profile returns `[]`; inserting a row owned by another user is rejected `403` "new row violates row-level security policy"; inserting their own row succeeds `201`.
- CHECK constraint enforced end-to-end: `source: "linkedin"` → `400 / 23514 jobs_source_check`.
- All probe users and rows deleted afterward; cascade confirmed clean (`jobs`, `agent_runs`, `agent_logs` all back to 0).

**04 Database Schema — deferred, not built**

Three mismatches between `build-plan.md` and `architecture.md` were resolved in `architecture.md`'s favour, since it is the schema authority. Flagging them so the features that hit them are not surprised:

- **`build-plan.md` 04 asks for "tailored fields" on `jobs`.** `architecture.md`'s `jobs` table has none, and no feature in the 17 produces them (there is no resume-tailoring or cover-letter feature). Looks vestigial from a cut feature — omitted. Note that feature 14's mock dashboard still shows a "Cover Letters Generated" stat card with no data source behind it.
- **`build-plan.md` 06 says completion percentage and missing fields are "calculated and saved".** `architecture.md`'s `profiles` has only `is_complete boolean` — no `completion_percentage` or `missing_fields` columns. Built as specified; feature 06 either computes the percentage at render or adds the columns itself.
- **`build-plan.md` 16 sorts recent activity by `created_at`.** `agent_runs` has no `created_at` — use `started_at`.

**05 Profile Page — Full UI**

- **The design is a 1470px canvas at exactly 2× scale** (2940px export, no frame — unlike the landing page's 4.022 scale with a 4px black border). Confirmed independently by the 36px logo mark and the 64px navbar. Every number below was sampled from `profile.png`, not eyeballed.
- **Verified by rendering, not by inspection.** The built page was screenshotted at the design's own width and every card boundary, section height and the total page height compared against the design: all within **2px** (page height 3171 vs 3173). Three defects were found this way and fixed — a 1px-tall navbar, a banner sized by the wrong padding, and a work-experience card 11px too tall.
- **First signed-in page, so the app shell landed here.** New `app/(app)/` route group (`layout.tsx` + `AppNavbar`) rather than repeating the navbar on three pages. A route group adds no URL segment, so `/profile` is unchanged and `proxy.ts` still protects it. `architecture.md`'s folder structure is updated to match.
- **`AppNavbar` is separate from the marketing `Navbar`** and is the one client component in `layout/` (active item comes from `usePathname()`). Two ui-rules.md conflicts resolved in the design's favour, as that file itself instructs: the active item has a 2px accent underline (rules say colour-only) and each item has an icon (rules don't mention them).
- **Native form controls, no shadcn/ui.** shadcn is still uninstalled and the design's controls are plainly native — a `<select>` with a chevron, a native checkbox, `<input type="month">` date pickers. Native keeps the page a Server Component tree, needs no Radix, submits into `formData` for free in feature 06, and avoids the pending shadcn token-mapping work. Only three pieces are client components: `TagInput`, `WorkExperienceList`, and `AppNavbar`.
- **Inputs tint when they hold a value** (`bg-surface-secondary`, empty ones `bg-surface`) via the CSS `placeholder-shown:` variant — no JS, correct as the user types. Inside the tinted work-experience card the rule inverts (always white, tinted only when disabled). Consequence: **every input must carry a `placeholder`**, or an empty field renders tinted.
- **`py-[38px]` silently generated no CSS** in this project's Tailwind build, while `h-[38px]` and `h-[252px]` in the same commit worked. Root cause not identified; `py-9.5` (v4's fractional dynamic-spacing step) produces the same 38px reliably. Worth remembering: a missing padding class fails silently — confirm a computed style after using an arbitrary spacing value.
- **Five new tokens.** `--color-text-label` (#4A5565 — inactive nav items *and* every form label; ui-rules.md names this colour but no token covered it) plus the error family the banner needs: `--color-error-strong` (#FB2C36 tag text), `--color-error-light` (#FFE2E2 ring track + banner border), `--color-error-lightest` (#FEF2F3 tag background), `--color-error-tint` (#FFFDFD banner fill). The Add button's #F3F4F6 was mapped onto the existing `surface-tertiary` (#F2F5F7) — a 1/255 difference per channel, not worth a token.
- **Card padding is 32px, not the 24px in ui-rules.md**, and the section rhythm is a consistent 48px above and below each divider, 20px between form rows, 6px between a label and its control.
- **Completion is ten equally weighted required fields**, so the percentage always lands on a multiple of ten and the mock reproduces the design's 70% with exactly PHONE / LOCATION / EDUCATION missing. Optional fields (industries, salary, preferred locations, the URLs) are excluded. `lib/profile-completion.ts` is the single source; feature 06 can reuse it to set `is_complete`.
- **Mock is a full `profiles` row.** `lib/mock-profile.ts` is typed as the new `types/index.ts` `Profile`, which mirrors the table's column names exactly — so feature 06 swaps one import in `app/(app)/profile/page.tsx` and touches no component. Delete `lib/mock-profile.ts` then.
- **No Cover Letter Tone field.** `build-plan.md` 05 lists one under Job Preferences, but it is absent from the design and cover-letter generation is explicitly out of scope in `project-overview.md`. Omitted; `profiles.cover_letter_tone` stays null. (Same family as the vestigial "tailored fields" flagged in feature 04.)
- **`ResumePreview.tsx` not built** — the design has no state for an already-uploaded resume. It belongs with feature 06/08, which is also where the private-bucket read path gets settled.
- **The form is a real `<form>` with an inert `type="button"` Save.** Feature 06 adds `action={saveProfile}` and flips the button to `type="submit"`; leaving it as a submit now would GET-navigate to the same URL. The resume dropzone is a `<label>` wrapping an `sr-only` file input, so it is clickable and keyboard-reachable without JS.

**05 Profile Page — still open**

- **Client-side `identify()` / `posthog.reset()` are still not wired** (carried from feature 03). This feature added the first authenticated Client Components, but the design's navbar has **no sign-out affordance**, so there is still nothing to hang `reset()` on. Do it with the first page that adds one.
- `/profile` was temporarily removed from `proxy.ts`'s matcher to screenshot the page without a session, then restored — `git diff proxy.ts` is clean. A real signed-in run still needs `allowedRedirectUrls` fixed in the InsForge dashboard (carried from feature 02).
- The page currently prerenders as static. It becomes dynamic in feature 06 when it reads the session.

**06 Profile Save Logic**

- **Two Server Actions in `actions/profile.ts`, both `useActionState`-shaped.** `saveProfile` writes every field in one `update`; `uploadResume` puts the PDF in storage on file selection. Both return `{ status, message }` — the `code-standards.md` contract, made visible by giving `ProfileForm` and `ResumeUpload` a `"use client"` boundary. A `"use server"` module may only export **async functions**, so the `useActionState` initial state is declared on the client side of the boundary rather than exported from the action file.
- **Uploads happen immediately on file selection, not on Save.** The dropzone is a sibling card *outside* the profile `<form>`, so it could never have ridden along on the same submit, and feature 07's "Extract from Resume" needs the file already in storage. The new `<form>` wraps only the dropzone — the "Generate Resume from Profile" button stays outside it so it cannot become a submit.
- **Next caps Server Action bodies at 1MB.** The dropzone promises 5MB, so `next.config.ts` now sets `experimental.serverActions.bodySizeLimit: "6mb"` — the limit covers the raw multipart body including boundaries and part headers, so it needs headroom over the real cap, which `uploadResume` enforces itself (type must be `application/pdf`, size no more than 5MB).
- **The size check has to run on the client too — found by testing, not by reading.** A 6.3MB PDF tripped Next's own `bodySizeLimit` *before* `uploadResume` could run (`Error: Body exceeded 6mb limit`), so the user got a framework error page instead of "That file is larger than the 5MB limit." Raising the limit only moves the cliff; the fix is to reject the file in `ResumeUpload`'s `onChange` so it never leaves the browser, and clear the input. The server check stays as the authoritative one — the client is not a security boundary. Both sides now read `MAX_RESUME_BYTES` / `RESUME_MIME_TYPE` and the two error strings from `lib/utils.ts` (previously an empty file), so the limit is stated once.
- **`is_complete` is persisted; percentage and missing fields are not.** `build-plan.md` 06 says to save all three, but `profiles` has only `is_complete` (flagged as a deferred mismatch back in feature 04) and the other two are derivable from the same row — stored copies would go stale the moment anything else writes to `profiles`. `lib/profile-completion.ts` stays the single source and is still computed at render; its parameter was widened from `Profile` to a `Pick<>` of the ten fields it reads so the action can pass the parsed payload without inventing columns it does not write. `db/schema.sql` is unchanged by this feature.
- **`resume_pdf_url` holds the object key, not a URL.** The bucket is private, so there is nothing fetchable to store. The SDK's `createSignedUrl(key, ttl)` is how features 07/08 hand the file to a browser — see the corrected Storage section in `library-docs.md`.
- **Three `library-docs.md` drifts corrected**, all found by reading the installed `.d.ts` rather than trusting the file: DB queries are `insforge.database.from(...)` (`insforge.from(...)` does not exist); `getPublicUrl()` **does** exist and `createSignedUrl()` exists too, so the previous "write a server route that streams `download()`" prescription was wrong; and `upload()` genuinely has no `upsert` option but replaces in place anyway. Same class of drift as the `@insforge/ssr` package that turned out not to exist.
- **Parsing and validation live in `lib/profile-form.ts`, not in the action.** A `"use server"` file cannot export the pure helpers, which would have left the fiddliest logic in the feature untestable — and feature 07 needs the same schema to validate GPT-4o's extracted profile. The reader normalises (trim, empty string to null, comma-split, coerce number, build the nested objects) and zod validates the result, so neither layer does both jobs.
- **Three native-form encoding quirks the parser has to respect.** An unchecked checkbox submits **nothing at all**, so `is_current` is presence-based. A **disabled** input submits nothing either — which is exactly what happens to End Date once "Currently working here" is ticked, so `end_date` is simply absent for that index and defaults to an empty string. And the read-only Email input still submits its value, so email is deliberately re-read from the row instead: a client must not get to say what its own row already contains.
- **A role added but never filled is dropped**, not written as an empty object — the filter is blank company *and* blank title.
- **Enum values are validated in the zod layer, as `architecture.md` intended** when it left CHECK constraints off `experience_level` / `remote_preference` / `work_authorization`. Each list is declared `as const satisfies readonly ExperienceLevel[]`, so it cannot drift from the union in `types/index.ts` without failing the build. Every zod message is written to read as English, and the field label comes from the **deepest** named path segment — so a bad graduation year reports "Graduation year", not "Education".
- **`profile_completed` fires only on the false to true transition.** The action re-reads `is_complete` before writing precisely so a second save of an already-complete profile does not re-fire it. Added as `trackProfileCompleted` in `lib/analytics.ts`, matching `trackServerSignIn`'s create → capture → `await shutdown()` shape.
- **`lib/mock-profile.ts` deleted.** `lib/profile.ts`'s `getCurrentProfile()` replaces it, normalising the two `jsonb` columns at the read boundary (`education` defaults to an empty object and `work_experience` to an empty array in the schema, neither of which matches the `Profile` type). It holds the feature's one type assertion, commented. `/profile` now renders dynamic (f) rather than static (o), as expected.

**06 Profile Save Logic — verification**

Verified end to end against the live backend, signed in with a real Google account.
The `allowedRedirectUrls` blocker carried since feature 02 is **resolved** — the backend
accepts `http://localhost:3000/callback` and the full OAuth round trip now completes.

- `tsc --noEmit`, `eslint .` and `next build` all clean; the build confirms `/profile` flipped from static to dynamic.
- **First load of the real page** showed 20% complete with only FULL NAME and EMAIL filled — exactly the two columns `handle_new_user()` copies from `auth.users` at signup. The trigger works against a real OAuth signup, not just the synthetic insert tested in feature 04.
- **Save round trip.** Filled every field including two roles (one with "Currently working here" ticked) and three skills, saved, and read the row back with `run-raw-sql`. `skills` / `industries` / `job_titles_seeking` / `preferred_locations` are real `text[]`; `work_experience` is a jsonb **array** of 2 whose `is_current` is a genuine boolean, not the string `"on"`; the current role's `end_date` is `""` even though its disabled input sent nothing; `education` is a populated object; `is_complete` is true; `cover_letter_tone` stayed null; `updated_at` was bumped by the trigger. **`email` is the real Google address from the row, so the read-only input's value was correctly ignored.**
- **Reload persistence.** After a hard reload every value rehydrates, the attention banner is gone at 100%, and both roles come back with the checkbox state and the disabled End Date intact.
- **`profile_completed` fired exactly once.** Confirmed in PostHog (`select count() from events where event = 'profile_completed'` → 1) despite two saves; the second save of an already-complete profile did not re-fire it.
- **Resume upload.** A `.png` is rejected ("Only PDF files can be uploaded"); a 6.3MB PDF is rejected client-side with the 5MB message (this is the case that exposed the `bodySizeLimit` defect above); a valid PDF uploads and reports its filename. Uploading a second PDF left **exactly one** object in the bucket (`select key from storage.objects` → one row, `uploaded_at` from the second upload), confirming `upload()`'s replace-in-place semantics and that the missing `upsert` option costs us nothing. `resume_pdf_url` holds the bare key `{user_id}/resume.pdf`.
- **`createSignedUrl` verified against the live backend**, not just the typings: it minted a URL that fetched the object with **no credentials at all** — 200, `application/pdf`, real `%PDF-` bytes. That is the read path features 07 and 08 should use, and it is now what `library-docs.md` prescribes.

**06 Profile Save Logic — issues found by `/review` and fixed**

A review pass after the feature was verified turned up 11 issues; all were fixed and re-verified.

- **Every `.max()` in the Zod schema leaked raw library text.** "Full name Too big: expected string to have <=200 characters." reached the user, violating `code-standards.md`'s "never expose raw error messages". Reachable by pasting into any field — none carry `maxLength`. Every length and count constraint now carries its own message via the `tooLong()` / `tooMany()` helpers. This is the general lesson: **giving custom messages to the interesting cases is not enough — an unmessaged Zod constraint is a user-visible string.**
- **`uploadResume` processed the payload before checking the session.** Harmless here, but this action is the template features 07/08 will copy, and there the following work is a GPT-4o call. Auth is now the first statement in both actions, and `code-standards.md` records the rule.
- **A transient read failure logged the user out.** `getCurrentProfile()` returned `null` for both "no session" and "the query failed", and the page redirected to `/login` on null. It now returns a `ProfileResult` discriminated union; the page redirects only on `unauthenticated` and throws on `error`, which lands on a new `app/(app)/error.tsx` boundary (verified by forcing a throw: it renders inside the app shell, keeps the navbar, and does not redirect).
- **`profile_completed` could fire more than once.** It was gated on the `is_complete` false→true transition, so clearing a field and re-filling it fired it again — but `code-standards.md` defines it as "first time". Added `profiles.profile_completed_at timestamptz` (in `db/schema.sql`, applied and backfilled), set once and never cleared, and the event is gated on it being null. Verified by running a full un-complete → re-complete cycle: `profile_completed_at` stayed at its original timestamp and PostHog still shows exactly one event. **This is the one place the "persist nothing derivable" decision does not apply — "has this ever been true" is not derivable from the current row.**
- **Dropdown values were duplicated** between `ProfileForm.tsx` and the Zod schema with nothing tying them together; adding an option to a dropdown would have rendered fine and then failed validation on save. New `lib/profile-options.ts` is the single source: each tuple is `satisfies`-checked against its union in `types/index.ts`, and each label map is a `Record` keyed by that tuple, so a value without a label (or vice versa) fails to compile. Both the form and the schema derive from it.
- **Comma-separated `text[]` inputs could not hold a comma.** "San Francisco, CA" split into two rows. Job Titles Seeking and Preferred Locations now use `TagInput`, the same component Skills and Industries already use, and the reader takes them with `repeated()` rather than splitting. A deliberate deviation from `profile.png`, which shows plain inputs — recorded in `ui-registry.md`. Verified: the value round-trips to Postgres as a single array element. **Confirmed by the developer 2026-10-04** — the deviation is accepted and `profile.png` is not to be followed here; this is no longer an open question.
  - Worth noting the trap this created and caught: switching the component without switching the reader left `commaSeparated()` reading only the *first* input and still splitting it, silently dropping the rest. The synthetic parser check found it before it shipped.
- **Error text used `role="status"`**, a polite live region that is not reliably announced for a failed save. Both status lines now switch to `role="alert"` when the state is an error.
- **A 0-byte file reported "Choose a PDF to upload."** — "no file" and "empty file" are now separate messages.
- **`code-standards.md` said every Server Action returns `{ success, error }`**, which these two do not — `useActionState` needs an idle state and a success message. The file now documents the `(previousState, formData) -> { status, message }` form-action contract alongside the original, including the "only async exports from a `use server` module" and "authenticate first" rules.
- **`architecture.md`'s `lib/` boundary** did not cover a session-scoped read helper like `getCurrentProfile`. The System Boundaries table now says so explicitly, and adds "reads only — every write goes through `actions/` or `agent/`".
- **`architecture.md` claimed `lib/utils.ts` holds `MATCH_THRESHOLD`.** It does not; that lands with feature 10/11. Corrected.

**06 Profile Save Logic — resume review (follow-up)**

Reported after the commit: the upload succeeded but there was no way to look at the file. `ResumePreview.tsx`, carried as "not built" since feature 05, is now built.

- **`app/api/resume/view/route.ts`** — a redirect-only Route Handler (the exception `code-standards.md` already documents for `callback/route.ts`). It checks the session, mints a **60-second** signed URL, and 302s to it.
- **A signed URL must not be embedded in the page.** It is credential-free *and* time-limited, which is the worst pair for a link in rendered HTML: it leaks with the markup and expires while the page sits open, so the user clicks a dead link. Routing through an in-app href means the page holds a stable link, each click mints a fresh short-lived credential, and a signed-out request lands on /login. Recorded in `library-docs.md`.
- **`ResumePreview.tsx`** renders the filename plus a `View resume` link under the dropzone. `profile.png` has no design for this state, so it is composed from shapes already on the page — the tinted card treatment from Work Experience and the existing 40px control height. The status line above it now reports only the last action rather than doubling as the resting state.
- The stored value is an object **key** (`{user_id}/resume.pdf`), not a display name, so the component derives the filename from the last path segment.
- **`/api/resume/:path*` added to `proxy.ts`'s matcher.** Caught while wiring this up: the route was outside the matcher, and `updateSession` in the proxy is the only thing that refreshes the 15-minute access token (`createServerClient` only reads it). A "View resume" click more than 15 minutes after the page loaded would have failed as if signed out. Also covers the generate/extract routes features 07 and 08 add.
- Verified: the link resolves through the redirect to a 200 `application/pdf` (real `%PDF-` bytes, the user's own 325KB file); the same URL with no session cookie 307s to `/login`; and `/api/resume/nope` 307s rather than 404s, which proves the proxy now runs on that path (the control `/api/other/nope` still 404s).

**06 Profile Save Logic — still open**

- **The profile row now holds placeholder data** entered during verification (Vercel / Stripe roles, a Hanoi address, a 600-byte stub PDF in storage). Harmless, and useful as a populated profile for features 07/08 to develop against, but it is not real — overwrite it through the UI whenever convenient.
- **Client-side `identify()` / `posthog.reset()` still not wired** (carried from 03, 04 and 05). This feature added no sign-out affordance either, so there is still nothing to hang `reset()` on.
- **Server-side exception tracking still off** (carried from 03).
- **`/dashboard` is still a 404** — the OAuth callback redirects there on success, so a real login currently lands on a missing page until feature 14.

---

## Notes

- **shadcn/ui token mapping (pending)** — shadcn expects its own semantic variables (`--background`, `--card`, `--primary`, `--ring`, `--radius`). Ours are named differently (`--color-background`, `--color-surface`, `--color-accent`). When shadcn is initialised, map its variables onto our tokens rather than letting `shadcn init` overwrite the `@theme` block.
- **Raw Tailwind palette is still available** — `bg-purple-500` etc. would compile. It could be disabled with `--color-*: initial`, but that also removes `text-white`, `border-transparent` and `bg-current`, which shadcn components rely on. Enforcement stays a review-time discipline.


---

## 07 AI Profile Extraction from Resume

Completed 2026-09-07. The project's first AI call — the shape features 10, 11
and 12 will copy.

**What was built**

`app/api/resume/extract/route.ts` (POST, no body) -> `agent/resume-extractor.ts`
(download -> pdf-parse -> GPT-4o -> validate) -> `lib/resume-extraction.ts`
(schema + merge) -> `components/profile/ExtractFromResume.tsx` and
`ProfileWorkspace.tsx`. New `lib/openai.ts` owns the client and the model
constant. `next.config.ts` gained `serverExternalPackages`.

**Decisions**

- **The route writes nothing.** `saveProfile` stays the only path into the
  `profiles` table; the user reviews GPT's guesses and presses Save themselves.
  This is why extraction is a Route Handler and not a Server Action —
  `architecture.md` scopes `actions/` to mutations, and this mutates nothing.
- **An API route, not a Server Action**, also because `architecture.md` already
  declared `app/api/resume/extract/route.ts`, and `/api/resume/:path*` was
  already in `proxy.ts`'s matcher, so the access token refreshes on it.
- **The form is repopulated by remounting it with a `key`**, not by converting
  its inputs to controlled ones. `ProfileWorkspace` owns the extraction and
  bumps a version counter; `ProfileForm` remounts and every field re-reads its
  `defaultValue`. Converting five input components to value/onChange would have
  been a far larger change than the feature asked for. The cost is that an
  extraction discards edits typed but not saved — the button's own copy says so.
- **Extracted values win only where there is one.** `mergeExtractedProfile` falls
  through to the current value for every null and every empty array, so a resume
  with no phone number cannot clear the phone number the user typed. Verified
  live: a student CV returned nulls for phone, skills and work experience, and
  all three survived the extraction untouched.
- **Only the twelve fields a resume actually contains.** Preferences (job titles
  seeking, remote preference, salary, preferred locations), work authorization
  and the read-only email are never sent to the model — `build-plan.md` says
  "all profile field names", but a model asked for a salary expectation would be
  inventing one.
- **`extractedProfileSchema` is `profileFormSchema.pick(...)`**, so the model is
  validated against the same schema `saveProfile` uses and the two cannot drift.
  Every field carries `.catch()`: a model that returns "mid-level" where the enum
  wants "mid" costs that one field, not the whole extraction — and a dropped
  field falls through to the existing value anyway.
- **`OPENAI_API_KEY` -> `OPENROUTER_API_KEY`.** The key in `.env.local` was always
  an OpenRouter key; the docs said otherwise. `lib/openai.ts` now owns the
  `baseURL` and the `openai/gpt-4o` model string so no feature retypes either.
- **No new PostHog event.** `code-standards.md` fixes the list at six and forbids
  inventing names; adding `resume_extracted` is a separate decision.
- **No `agent_logs` row.** That table's `run_id` hangs off `agent_runs` and this
  is not an agent run. Errors log with the `[agent/resume-extractor]` prefix.

**Problems solved**

- **`pdf-parse` needs `serverExternalPackages`.** Every parse failed at runtime
  with `Setting up fake worker failed: Cannot find module
  '.next/dev/server/chunks/pdf.worker.mjs'` — pdf.js resolves its worker by file
  path, and bundled that path points into `.next/` where the worker was never
  emitted. **`tsc` and `eslint` were both clean while this was broken**; only a
  real request found it. The general lesson: a package that loads a sibling file
  at runtime cannot be bundled.
- **`library-docs.md` documented pdf-parse 1.x**, which is not what installs
  today. 2.4.5 is a class (`new PDFParse({ data }).getText()`) holding a pdf.js
  document that must be `destroy()`ed in a `finally`. Corrected in the doc, read
  off the installed `.d.ts` — the same habit that caught three InsForge drifts in
  feature 06.
- **An image-only PDF does not throw.** It parses fine and returns about a dozen
  characters, so a length check is the only signal there was no text layer.
  Verified against a hand-built text-free PDF: 12 characters, under
  `MIN_RESUME_TEXT_LENGTH`, friendly error, no GPT-4o call spent.
- **800 output tokens only fits if the prompt bounds the longest field.** Three
  roles with free-form responsibilities overrun it, and a truncated
  `json_object` response fails `JSON.parse` — so the budget would have been
  misdiagnosed as a bad model response. The prompt caps responsibilities at one
  sentence, and `finish_reason === "length"` is checked before parsing so a
  future overrun reports itself.
- **The dev server logs to `.next/dev/logs/next-development.log`.** Worth knowing:
  an error thrown inside a Route Handler is invisible from the browser, and
  Next 16 refuses to start a second dev server for the same project. That file
  is how to read the stack.
- **A second `SESSION_EXPIRED` string had appeared.** Now `SESSION_EXPIRED_ERROR`
  in `lib/utils.ts`, shared by both profile actions, the extract route and the
  button that calls it.

**Verified live** (real Google session, the developer's own resume):

- Extraction returns `{ success: true, data }` and repopulates the form; no
  request to `profiles` fires — nothing is persisted before Save.
- Merge holds: extracted `location` and `institution` won; `phone`, `skills` and
  both work-experience roles were absent from the extraction and survived, as did
  the never-extracted `salary_expectation` and `preferred_locations`.
- Save round-trip: the extracted values persist and reload correctly.
- Pending state renders (`Loader2` + "Reading your resume…"); the error path
  renders `role="alert"` (seen for real while the worker bug was live).
- `resume_pdf_url` null -> 400 with "Upload a resume before extracting your
  profile from it." (tested by nulling the column and restoring it).
- Signed out -> the proxy 307s `/api/resume/extract` to `/login`.

**07 Review pass**

A `/review` after the feature was verified found 10 issues; a reported failure
("I upload the new pdf and click extract, it returns Could not extract text")
turned out to be correct behaviour but exposed three of them. All 11 are fixed
and re-verified.

*The reported failure was not a bug.* The uploaded PDF had **zero font objects**
and one 900x1165 image, produced by iLovePDF — a picture of a resume, not a
document. Adding pdf.js cmaps and standard font data changed nothing, because
there is no encoded text to decode. Reading that file needs OCR, which is not in
this feature or the build plan.

- **The length check was measuring page numbers.** `pdf-parse`'s `result.text`
  interleaves a `-- 1 of 20 --` marker per page, and those count as text: a
  20-page scan with no text layer produced 347 characters of markers, cleared
  `MIN_RESUME_TEXT_LENGTH`, and would have sent pure page numbers to GPT-4o to
  invent a profile from. `readPdfText` now joins `pages[].text`, which carries
  only what was on the page — 0 characters at every page count tested (1, 10, 20,
  30). **The earlier "verified with a text-free PDF" claim was wrong**: that test
  used a *one*-page PDF, so it measured a single separator and read 12 characters
  as evidence the check was sound. It only ever held for short documents.
- **The merge could blank a filled field.** `pickText` used `??`, which falls
  through on null but not on `""` — and the schema accepts `""` as a valid
  nullable string. An extraction of empty strings overwrote full_name, phone,
  location and current_title and reported "Filled in 4 fields". The live path
  never hit it because `normalizeExtracted` maps `""` to null server-side, but
  the merge must not depend on its caller having normalized: refusing to blank a
  filled field is the entire reason it exists. Caught by stubbing the fetch in
  the browser, which is the only check that exercised the client-side merge
  without the server's normalizer in front of it.
- **`is_current` was inferred from "we could not parse this".** Any unparseable
  end date set the flag, so a role ending `"2019"` — a plausible slip when the
  prompt asks for `YYYY-MM` — came back ticked as "Currently working here" with
  its End Date disabled. Only an explicit flag or a genuine present/current/now
  now counts, and a bare year is rescued to `YYYY-01` instead of blanked.
- **One over-long entry discarded a whole array.** `.catch()` on an array drops
  every element, not the offending one, so a single 61-character skill took the
  other forty-nine with it. `normalizeExtracted` now drops the offending entry
  before validation. Over-limit values are dropped rather than truncated — a
  200-character "skill" is not a skill, and a cut-off version puts something in
  the form the resume never said. `responsibilities` is the one exception: it is
  prose, so truncation still reads correctly.
- **A successful extraction that changed nothing said nothing.** Indistinguishable
  from a dead button — I hit it myself during the original verification and
  assumed the click had not registered. `mergeExtractedProfile` now returns
  `{ profile, changed }` and the row reports either "Filled in N fields from your
  resume." or "We read your resume but found nothing to add to the fields below."
- **The one failure users actually hit wrote nothing to the log.** Diagnosing the
  report needed a signed URL, a download and a local probe. The branch now logs
  the character count it rejected.
- **The error message told the user nothing actionable**, so the natural next
  move is to re-export the same way and fail again. Now: "There is no text in
  this PDF — scans and image exports look like this. Upload a PDF saved from a
  document instead." **A deliberate departure from `build-plan.md` 07's exact
  wording.**
- **`fetch` had leaked into a component.** `architecture.md` scopes `components/`
  to "UI only. No data fetching logic", and `ExtractFromResume` held the only
  `fetch` in the codebase — everything else reaches the server through a Server
  Action. Moved to `requestResumeExtraction()` in `lib/resume-extraction.ts`; the
  component now renders and nothing else.
- **Two uncommented type assertions** (`value as Record<string, unknown>`,
  `DEGREES as readonly string[]`). `lib/profile.ts` already solved the first
  without one — annotate the target instead of asserting — and the second is now
  an `isDegree` type guard. `code-standards.md` forbids uncommented assertions,
  and feature 06's review is what put that rule there.
- **`pickText` had no return type**, alone among the helpers in its own file.
- **`MAX_ROLES = 3` existed in three files**, so the form could offer a fourth
  role the schema would reject. It, `MAX_TAGS`, `MAX_TAG_LENGTH`,
  `MAX_FIELD_LENGTH`, `MAX_PHONE_LENGTH` and `MAX_RESPONSIBILITIES_LENGTH` are
  now single-sourced in `lib/utils.ts` and consumed by the schema, the form and
  the normalizer.

**Verification.** 22 assertions run against the real modules (aliases rewritten,
`node --experimental-strip-types`) covering the `is_current` cases, per-entry
array trimming, the empty-string merge and the changed-count. Live in the
browser: the image PDF now returns the new message with `role="alert"`; a stubbed
all-empty extraction reports "found nothing" and blanks nothing; a stubbed
two-field extraction reports "Filled in 2 fields" and changes exactly those two.

**07 Scanned resumes (the last two open items)**

- **A scan is now read, not rejected.** `openai/gpt-4o` is multimodal, so an
  image-only PDF needs no OCR dependency — the model that structures the text is
  the one that reads it off the page. When `pages[].text` comes back under
  `MIN_RESUME_TEXT_LENGTH`, `readPdf` pulls the embedded page images and the same
  prompt is sent with `image_url` content parts instead of a string.
  - **`getImage`, not `getScreenshot`.** `getScreenshot` would rasterise any page
    — including one that draws text as vectors — but it needs a canvas Node does
    not have and throws `Cannot transfer object of unsupported type`. Embedded
    images are exactly what a scan-to-PDF produces, so `getImage` covers the case
    that matters.
  - **Bounded on purpose:** `MAX_OCR_PAGES = 2` (a third page is rarely new
    information, and each page is ~1MB of request body plus vision tokens) and
    `MIN_SCAN_IMAGE_PIXELS = 600` to keep logos and signatures out of it. Only
    the largest image per page is sent. Images are pulled *only* when there is no
    text — a normal resume never pays for it.
  - **Verified in a production build against the developer's own scanned PDF**
    (zero fonts, one 900x1165 image, Producer iLovePDF): GPT-4o returned name,
    phone, location, both URLs, title, level, years, 7 skills, 3 industries and 2
    roles with correct dates in ~23s, with `is_current` true on the open role and
    false on the closed one. Log: `no text layer, reading 1 page image(s)
    instead`.
  - `RESUME_TEXT_ERROR` now fires only when there is neither text nor a page
    image, and says so.
- **The missing-key branch was exercised.** A production server started with
  `OPENROUTER_API_KEY=` empty logs
  `[agent/resume-extractor] OPENROUTER_API_KEY is not set`, returns the handled
  422, and every other page still serves — `createOpenAI()` returns null rather
  than constructing a client, so there is no module-level throw.

**07 — still open**

- **A vision extraction costs meaningfully more than a text one** — more tokens
  and ~23s against ~5s. Acceptable for a button the user presses once, but worth
  remembering before anything calls this in a loop.
- **Client-side `identify()` / `posthog.reset()` still not wired** (carried from
  03, 04, 05, 06). Still no sign-out control to hang `reset()` on.
- **Server-side exception tracking still off** (carried from 03).
- **`/dashboard` is still a 404** — a fresh login lands on a missing page until
  feature 14.

---

## 08 Resume PDF Generation from Profile

Built 2026-09-08. Closes the loop feature 07 opened: the profile is the thing
the user maintains, and a resume is generated from it on demand.

**What was built**

`app/api/resume/generate/route.ts` (POST, no body) -> `agent/resume-writer.ts`
(GPT-4o writes the prose) -> `components/pdf/ResumeDocument.tsx`
(`renderResumePdf` -> `renderToBuffer`) -> upload to `resumes/{user_id}/resume.pdf`
-> `profiles.resume_pdf_url`. `lib/resume-generation.ts` holds the schema and the
browser's request helper; `components/profile/GenerateResume.tsx` replaces the
inert button that had been sitting in `ResumeUpload.tsx` since feature 05.

**Decisions**

- **The model writes prose and nothing else.** It returns
  `{ summary, roles: [{ index, bullets }] }`. Every fact on the page — name,
  email, phone, location, URLs, company names, titles, dates, skills, education
  — is rendered from the profile row. What is never sent to the model cannot
  come back hallucinated, and a resume with the wrong phone number on it is
  worse than no resume. It also keeps the budget at 900 output tokens.
- **Roles are addressed by index, never by company name.** Matching on a name
  means deciding what to do when the model returns "Vercel Inc." for a row that
  says "Vercel" — and getting that wrong staples one job's bullets under another
  job's title, the worst thing this feature could do. An index lines up or the
  role is dropped.
- **Generating replaces the single resume on file, and the UI says so first.**
  Same key as an upload, no schema change, `build-plan.md` 08 literal. Because
  that is a one-way destructive write over a file the user may have supplied
  themselves, `GenerateResume` shows a confirm step first — skipped when
  `resume_pdf_url` is null, since then there is nothing to replace. Knowingly
  accepted consequence: after generating, "Extract from Resume" reads the
  machine-written file. The confirm copy is what makes that a choice.
- **The gate is `getProfileCompletion().isComplete`, checked before the model
  call.** One definition of "enough profile" in the app — the same ten fields
  the completion ring and the attention banner use — so the missing-field labels
  the 422 hands back are the ones already on screen. An incomplete profile would
  otherwise spend a GPT-4o call producing an empty PDF.
- **Temperature 0.6, against the extractor's 0.3.** Extraction is transcription,
  where invention is the enemy. This is writing, and bullets at 0.3 read like
  they all came out of the same mould.
- **Helvetica only, no `Font.register`.** Registering a webfont fetches it at
  render time, putting a network call inside a button press that must not be
  able to fail that way. Bold is `fontFamily: "Helvetica-Bold"` — there is no
  bold to reach through `fontWeight`.
- **Single page is enforced by bounding the content, not by clipping.**
  `<Page>` flows onto page two silently. The caps live in `lib/utils.ts`.
- **No new PostHog event and no `agent_logs` row** — same reasoning as 07.
  `code-standards.md` fixes the event list at six, and `agent_logs.run_id` hangs
  off `agent_runs`; a button press is not a run.

**Deviations**

- **`ResumeDocument.tsx` uses hardcoded hex, against `ui-rules.md`.**
  @react-pdf/renderer's `StyleSheet` compiles to PDF drawing operations and
  cannot read a CSS custom property, so a PDF has no way to honour the token
  rule. Three values are copied into a `PDF_COLORS` map with the token each came
  from named in a comment on it. `--color-accent` is deliberately unused: a
  resume is a print and ATS artifact before it is a branded surface.
- **`build-plan.md` 08 says "GPT-4o generates professional resume content"**,
  which reads as the whole document. It writes the summary and the bullets —
  exactly the three things the plan then lists — and no facts. Deliberate.

**Problems solved**

- **`library-docs.md`'s @react-pdf/renderer section was wrong in three places**,
  having been written before the package was ever installed: it passed
  `{ contentType, upsert: true }` to an `upload()` that takes no options
  argument, told you to save a public URL for a bucket that is private, and
  listed a supported-CSS set about a third the size of the real one. Rewritten
  against `@react-pdf/renderer@4.9.0`'s own `.d.ts` — the same habit that caught
  the pdf-parse 1.x/2.x drift in 07 and three InsForge drifts in 06.
- **`renderToBuffer` returns a Node `Buffer`, which is not a `BlobPart`.** The
  storage `upload()` takes `File | Blob`, so the buffer is wrapped in a
  `Uint8Array` on the way in.
- **The route stays `.ts` by keeping the JSX behind `renderResumePdf`** in the
  document module, which is how `architecture.md` declares it.

**Fixed after `/review`**

Six issues found reviewing 08 against its plan, all fixed the same session.

- **`normalizeGenerated` did not bound `index`, so one bad index rejected the
  whole resume.** The schema bounded it, but a schema failure fails the entire
  `safeParse` — an index of 5 against three roles cost the user everything
  instead of one role's bullets. The exact shape of feature 07's
  over-long-skill bug, reintroduced. The range check now sits in the normalizer
  next to the other per-entry drops. Confirmed against the real modules: the two
  cases that rejected the batch now drop the bad entry and keep the good one.
- **A blank work-experience row printed a gap in the resume.**
  `workExperienceSchema` allows every field to be `""` and
  `getProfileCompletion` only counts entries, so a saved-but-unfilled role
  passed the gate. New `resumeRoles()` in `lib/resume-generation.ts` keeps only
  roles with a title or a company. **The writer and the document must both call
  it** — the indices in the response are positions in that list, so filtering
  differently in the two places would print one job's bullets under another
  job's title. The route now 422s when it leaves nothing.
- **`import "server-only"` was in the approved plan and had been dropped**
  during the build, because the package was not on the approved list. Fixing
  that the other way round was correct: `server-only` is installed and added to
  `code-standards.md`. It ships no runtime code, and it turns a stray client
  import of the PDF document — which would put pdfkit in the browser bundle —
  into a build failure instead of a comment nobody reads.
- **No timeout on the OpenRouter calls** (carried from 07, fixed for both).
  `lib/openai.ts` now sets a 60s client default and pins `maxRetries: 1` — the
  SDK's default of 2 would have made the worst case three attempts. The writer
  passes a tighter 30s per request; the wide client default exists for the
  extractor's vision pass, which measured ~23s in 07.
- **The summary's character cap was never told to the model**, so an over-long
  summary was silently cut mid-word on a document meant to be sent to employers.
  The prompt states it now, as it already did for bullets.
- **`promptInput` had no explicit return type**, against `code-standards.md`.

**Verified 2026-10-04** — signed-in run against `next start`, real session, real
backend. Five of the six outstanding checks pass; one is blocked.

1. **Happy path — pass.** `/Count 1`, MediaBox 595.28×841.89 (A4), 3341 bytes,
   `/BaseFont` limited to Helvetica and Helvetica-Bold. Contact line renders
   `email · phone · location · linkedin.com/in/… · github.com/…` with the
   schemes stripped; both roles print under the correct title with the right
   dates (`Jan 2022 — Present`, `Mar 2019 — Dec 2021`), bullets correctly
   indexed; skills and the education line come straight off the row. 12.3s.
   **The UI path is verified too**, not just the route: clicking the button runs
   idle → confirm → "Writing your resume…" with a spinner → "Your resume is
   ready. Open it below to check it before you send it anywhere." Rendered in
   Chrome's PDF viewer the page reads as a clean professional resume — bold name
   over a muted headline, right-aligned dates against bold role titles, ruled
   section headings, indented bullets, generous whitespace, nothing clipped.
   Confirmed by the developer 2026-10-04. (With two roles and no optional
   sections the lower third of the page is empty; expected, not a defect.)
2. **First generation with `resume_pdf_url` null — not run.** Needs the column
   nulled and there is no UI path to it. The InsForge MCP server stayed
   `CONNECTION_CLOSED` for the whole session, including after the developer
   reconnected it — MCP servers are dialled at session start, so a mid-session
   reconnect needs a Claude Code restart to take effect. `.env.local` carries
   only the anon key, which RLS correctly stops from updating a profile row, so
   there was no second path. Confirmed by inspection instead: `GenerateResume`
   branches on `if (resumeKey) → confirm; else → generate()`, and calls
   `router.refresh()` on success so the resume row and Extract button appear.
   The *confirm* branch is verified at runtime; only the one-line skip branch is
   unexercised. **Run this after any Claude Code restart with the MCP up.**
3. **Incomplete profile — pass.** Phone cleared and saved: 422,
   `Still missing: PHONE.`, in 2.25s against 12.3s for a real generation, so no
   GPT-4o call was made. Phone restored and re-verified after a reload.
4. **`OPENROUTER_API_KEY=` empty — pass.** 502 with the user-facing message,
   `[agent/resume-writer] OPENROUTER_API_KEY is not set` in the server log, and
   `/` and `/login` still 200.
5. **Round trip — pass.** Extract on the generated PDF returned the right name,
   title, years, all four skills and both roles with correct `is_current`.
   **It took 83s**, past the 60s client timeout and into its one retry — see the
   open question below.
6. **`@react-pdf/renderer` does not need `serverExternalPackages` — settled by a
   real render.** It was the right thing to doubt: pdfkit's Node build does not
   inline the standard-font metrics, it registers them lazily as
   `Helvetica: () => require$1('#standard-fonts/Helvetica')` — a runtime require
   of a wildcard subpath import, structurally the same trap as pdf-parse's
   worker path, and `getStandardFont` throws outright when it is unregistered.
   It survives because Turbopack leaves pdfkit external: after a build the
   string `Helvetica-BoldOblique` appears in no emitted JS, only in
   `route.js.nft.json`, which traces all 14 `.afm` files and the
   `standard-fonts/` modules. So Node's own `imports` resolution applies at
   runtime. **Do not "optimise" pdfkit into the bundle** — inlining it is what
   would break this, and neither `tsc` nor `next build` would notice.

**Found during verification — open**

- **~~The model invents specifics inside bullets~~ — withdrawn, it does not.**
  The generated resume carried "Led a team of three developers to deliver
  high-quality frontend solutions," which was flagged during verification as an
  invented claim. It is not: the role's `responsibilities` field reads "Shipped
  Next.js features and led a team of three." The number is the user's own, and
  the prompt already forbids inventing one ("Never invent a number") and already
  receives `responsibilities` in `promptInput`. The bullets are a faithful
  rewrite. **The finding was made without reading the source field and was
  wrong** — recorded here because the next reader would otherwise re-open it.
  What the model does add is qualitative padding ("innovative", "efficient",
  "high-quality"), which is ordinary resume prose and is the user's to edit.
  Bullets are also non-deterministic at temperature 0.6: two generations from
  the same row produced "led a team of three developers" and "led a team of
  three". Expected, not a defect.
- **Extraction on a generated PDF took 83s** (item 5), past the 60s client
  timeout and into its one retry. Not a text-layer problem: `pdf-parse` reads a
  @react-pdf/renderer file cleanly — verified directly, 205 chars including
  bullets and middots — so the vision fallback was not involved. The backend was
  flaky throughout the session (`[actions/auth] Service Temporarily Unavailable`
  and `Bad Gateway` in the log, InsForge MCP refusing connections), so this is
  most likely provider latency rather than a defect. Re-measure before treating
  it as one.
- **`normalizeGenerated` bounds `index` against `MAX_ROLES`, not the actual
  number of roles.** With two roles saved, an `index` of 2 passes both the
  normalizer and the schema, then matches nothing in `bulletsForRole` and is
  silently dropped. It did not bite here — the model returned 0 and 1 — and it
  fails in the safe direction (a role printed without bullets, never one job's
  bullets under another's title). Still, it is the same "bound it where it is
  used" lesson the earlier fix recorded.
