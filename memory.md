# Memory — 06 Profile Save Logic (complete, verified, committed)

Last updated: 2026-09-07

## What was built

Feature **06 Profile Save Logic** is done, verified end to end against the live
backend, reviewed, and committed. Two commits on branch
**`feature/profile-page-and-save`** (branched from `main` at `37e8f6a`; **not
merged** — `main` still has neither feature 05 nor 06):

- `608cbb1` — features 05 + 06 together. They could not be split: 05 was never
  committed last session, and 06 deletes the mock file 05 rendered from.
- `c7c0f75` — the resume-review follow-up.

New files: `actions/profile.ts` (`saveProfile`, `uploadResume`),
`lib/profile-form.ts` (zod schema + FormData reader), `lib/profile-options.ts`
(dropdown values/labels), `lib/profile.ts` (`getCurrentProfile`),
`app/(app)/error.tsx`, `app/api/resume/view/route.ts`,
`components/profile/ResumePreview.tsx`.
Modified: `ProfileForm.tsx` and `ResumeUpload.tsx` are now Client Components,
`lib/utils.ts` (was empty — now holds the resume limits), `lib/analytics.ts`
(`trackProfileCompleted`), `next.config.ts`, `proxy.ts`, `db/schema.sql`,
`types/index.ts`. `lib/mock-profile.ts` deleted.

## Decisions made

- **Persist `is_complete` only** — not completion percentage or missing fields,
  which `build-plan.md` 06 asks for. Both are derivable from the same row and
  would go stale; `lib/profile-completion.ts` stays the single source and is
  computed at render.
- **One exception to that rule:** `profiles.profile_completed_at` was added,
  because "has this profile *ever* been complete" is **not** derivable from the
  current row. It gates the one-shot `profile_completed` event.
- **`resume_pdf_url` holds the object key** (`{user_id}/resume.pdf`), not a URL
  — the bucket is private.
- **Never embed a signed URL in rendered HTML.** It is credential-free *and*
  time-limited: it leaks with the markup and expires while the page sits open.
  `app/api/resume/view` checks the session, mints a 60-second URL, and redirects.
- **`lib/profile-options.ts` is the single source for dropdowns.** Each tuple is
  `satisfies`-checked against its union in `types/`; each label map is a
  `Record` keyed by that tuple. Form and zod schema both derive from it, so they
  cannot drift.
- **Form Server Actions return `{ status, message }`**, not the
  `{ success, error }` in `code-standards.md` — `useActionState` needs an idle
  state and a success message. Now documented in `code-standards.md` as a second
  contract, with "authenticate before touching the payload" as a rule.
- **Job Titles Seeking / Preferred Locations use `TagInput`**, deviating from
  `profile.png`, which shows plain comma-separated inputs. A comma-separated
  input cannot hold "San Francisco, CA". Recorded in `ui-registry.md` — revert
  if the design must win.

## Problems solved

- **The `allowedRedirectUrls` blocker (carried since feature 02) is gone.** The
  backend accepts `http://localhost:3000/callback` and the full Google OAuth
  round trip completes. A real signed-in session now exists.
- **PKCE `code_verifier` cookie has a 600s max age.** Starting the OAuth flow
  and finishing the consent ~19 minutes later fails with "PKCE code verifier not
  found" — not a config problem. Complete the flow promptly.
- **Next caps Server Action bodies at 1MB.** `bodySizeLimit` is now `6mb`, but
  raising it only moves the cliff: Next rejects an over-limit body *before* the
  action runs, so the action's friendly error never returns. Any file input
  wired to a Server Action needs the size check client-side too.
- **`proxy.ts`'s matcher is the only thing refreshing the 15-minute access
  token** (`createServerClient` merely reads it). Any route reading the session
  — API routes included — must be in the matcher or it fails as "signed out"
  once the token ages out. `/api/resume/:path*` was added for exactly this.
- **Three `library-docs.md` drifts corrected**, all by reading the installed
  `.d.ts`: DB queries are `insforge.database.from(...)` (`insforge.from(...)`
  does not exist); `getPublicUrl()` *does* exist; `createSignedUrl(key, ttl)`
  exists and is the private-bucket read path (verified live). `upload()` has no
  `upsert` option but replaces in place anyway — one object after two uploads.
- **Zod v4: an unmessaged constraint is a user-visible string.** Every `.max()`
  leaked "Too big: expected string to have <=200 characters" into the UI. Zod v4
  takes a plain string as the message param (`z.string().max(200, "…")`,
  `z.enum(VALUES, "…")`).
- **A `"use server"` module may only export async functions** — the
  `useActionState` initial state must be declared on the client side.
- **Native form encoding traps** the parser handles: an unchecked checkbox
  submits nothing; a *disabled* input submits nothing (End Date, once
  "currently working here" is ticked); a read-only input still submits, so
  `email` is re-read from the row rather than trusted.
- **`next build` kills a running `next dev`** that shares the same `.next`
  directory. Do not run a build against the dev server the developer is using.

## Current state

- `tsc --noEmit`, `eslint .`, `next build` all clean. `/profile` renders dynamic
  (ƒ); `/api/resume/view` is in the route list.
- Verified live with a real session: every field round-trips, `skills` etc. are
  real `text[]`, `work_experience` is a jsonb array with boolean `is_current`,
  re-upload leaves exactly one storage object, `profile_completed` fired exactly
  once across a full un-complete → re-complete cycle, the error boundary renders
  without redirecting to `/login`, and "View resume" resolves to a 200 PDF while
  a cookie-less request 307s to `/login`.
- **`db/schema.sql` was changed *and applied* to the live backend**
  (`profile_completed_at`, added + backfilled). File and backend are in sync.
- The profile row holds **placeholder data** entered during verification (Vercel
  / Stripe roles, a Hanoi address) plus a **real resume PDF** the developer
  uploaded. Fine to overwrite through the UI.
- Uncommitted: `agentic-workflow-transplant.md` (untracked, not mine).
- `/dashboard` is still a 404 — the OAuth callback redirects there on success,
  so a fresh login lands on a missing page until feature 14.

## Next session starts with

Decide whether to `git checkout main && git merge --ff-only feature/profile-page-and-save`, then start feature **07 AI Profile Extraction from Resume**.

**07 is blocked on two things that are not yet in place:**

1. **`OPENAI_API_KEY` is not in `.env.local`** — it holds only the InsForge and
   PostHog variables. `code-standards.md` lists it as required for `agent/`.
2. **`openai` and `pdf-parse` are not installed** (`package.json` has only
   `@insforge/sdk`, `lucide-react`, `next`, `posthog-*`, `react`, `zod`). Both
   are on the approved dependency list.

Once unblocked: the uploaded PDF is read with
`storage.from("resumes").download(key)` — not a signed URL — and
`lib/profile-form.ts`'s `profileFormSchema` is the schema to validate GPT-4o's
extracted JSON against; it was extracted from the action partly for this.

## Open questions

- **Client-side `identify()` / `posthog.reset()` still not wired** (carried from
  03, 04, 05, 06). There is still no sign-out control anywhere in the UI to hang
  `reset()` on. Do it with the first feature that adds one.
- **Server-side exception tracking still off** (carried from 03) — needs a
  singleton `posthog-node` client at process start.
- **The `TagInput` deviation from `profile.png`** (Job Titles Seeking, Preferred
  Locations) was my call, not the developer's. Confirm they accept it.
- **`build-plan.md` 07 says the extracted fields "populate the form" before the
  user saves.** The form is currently uncontrolled (`defaultValue` throughout),
  so populating it after extraction needs either controlled inputs, a `key`
  remount, or a server round trip. Worth deciding in `/architect` before building.
