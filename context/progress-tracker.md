# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 06 Profile Save Logic — `/profile` reads the signed-in user's real row, `saveProfile` writes every field through a zod-validated Server Action, `uploadResume` puts the PDF in the private `resumes` bucket. Verified end to end against the live backend with a real Google session.
**Next:** 07 AI Profile Extraction from Resume

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
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

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
- **Comma-separated `text[]` inputs could not hold a comma.** "San Francisco, CA" split into two rows. Job Titles Seeking and Preferred Locations now use `TagInput`, the same component Skills and Industries already use, and the reader takes them with `repeated()` rather than splitting. A deliberate deviation from `profile.png`, which shows plain inputs — recorded in `ui-registry.md`. Verified: the value round-trips to Postgres as a single array element.
  - Worth noting the trap this created and caught: switching the component without switching the reader left `commaSeparated()` reading only the *first* input and still splitting it, silently dropping the rest. The synthetic parser check found it before it shipped.
- **Error text used `role="status"`**, a polite live region that is not reliably announced for a failed save. Both status lines now switch to `role="alert"` when the state is an error.
- **A 0-byte file reported "Choose a PDF to upload."** — "no file" and "empty file" are now separate messages.
- **`code-standards.md` said every Server Action returns `{ success, error }`**, which these two do not — `useActionState` needs an idle state and a success message. The file now documents the `(previousState, formData) -> { status, message }` form-action contract alongside the original, including the "only async exports from a `use server` module" and "authenticate first" rules.
- **`architecture.md`'s `lib/` boundary** did not cover a session-scoped read helper like `getCurrentProfile`. The System Boundaries table now says so explicitly, and adds "reads only — every write goes through `actions/` or `agent/`".
- **`architecture.md` claimed `lib/utils.ts` holds `MATCH_THRESHOLD`.** It does not; that lands with feature 10/11. Corrected.

**06 Profile Save Logic — still open**

- **The profile row now holds placeholder data** entered during verification (Vercel / Stripe roles, a Hanoi address, a 600-byte stub PDF in storage). Harmless, and useful as a populated profile for features 07/08 to develop against, but it is not real — overwrite it through the UI whenever convenient.
- **`ResumePreview.tsx` still not built** (carried from 05) — the design has no state for an uploaded resume, so the dropzone reports it as a one-line status instead. Revisit with feature 08.
- **Client-side `identify()` / `posthog.reset()` still not wired** (carried from 03, 04 and 05). This feature added no sign-out affordance either, so there is still nothing to hang `reset()` on.
- **Server-side exception tracking still off** (carried from 03).
- **`/dashboard` is still a 404** — the OAuth callback redirects there on success, so a real login currently lands on a missing page until feature 14.

---

## Notes

- **shadcn/ui token mapping (pending)** — shadcn expects its own semantic variables (`--background`, `--card`, `--primary`, `--ring`, `--radius`). Ours are named differently (`--color-background`, `--color-surface`, `--color-accent`). When shadcn is initialised, map its variables onto our tokens rather than letting `shadcn init` overwrite the `@theme` block.
- **Raw Tailwind palette is still available** — `bg-purple-500` etc. would compile. It could be disabled with `--color-*: initial`, but that also removes `text-white`, `border-transparent` and `bg-current`, which shadcn components rely on. Enforcement stays a review-time discipline.
