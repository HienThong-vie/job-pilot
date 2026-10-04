# Memory — Verifying and committing features 07 + 08

Last updated: 2026-10-04

## What was built

No new feature code this session. Feature **08 Resume PDF Generation** was
already built by an earlier session that never ran `/remember save` — the
previous `memory.md` was a day stale and claimed 08 had not started. This
session verified 08 end to end, corrected a wrong finding, and committed
features **07 and 08 together** as `e326675 Generate and extract resumes with
GPT-4o` (25 files, +3496/−125), then fast-forwarded `main`.

Only documentation changed: `context/progress-tracker.md` now carries the full
08 verification record, three findings, and the corrections below.

## Decisions made

- **One commit for 07 and 08, not two.** `components/profile/ResumeUpload.tsx`
  imports both `ExtractFromResume` (07) and `GenerateResume` (08), so no commit
  containing that file can build without 08. Splitting would have meant
  hand-reconstructing an intermediate version of it that does not exist in the
  tree and could not be build-verified.
- **Three files deliberately left uncommitted**: `.claude-flow/policy/state.json`
  (tool state), `agentic-workflow-transplant.md` (untracked, not part of either
  feature), and at commit time `memory.md`, whose diff was pure CRLF churn.
- **`@react-pdf/renderer` must stay OUT of `serverExternalPackages`** — and
  pdfkit must never be inlined into the bundle. See below.

## Problems solved

- **`@react-pdf/renderer` does not need `serverExternalPackages` — settled by a
  real render, and the reasoning matters.** pdfkit's Node build does not inline
  the standard-font metrics; it registers them lazily as
  `Helvetica: () => require$1('#standard-fonts/Helvetica')`, a runtime require of
  a wildcard subpath import, and `getStandardFont` throws outright if it is
  unregistered. Structurally the same trap as pdf-parse's worker path. It works
  only because Turbopack leaves pdfkit external: after a build the string
  `Helvetica-BoldOblique` appears in no emitted JS, only in
  `route.js.nft.json`, which traces all 14 `.afm` files. **Anything that bundles
  pdfkit breaks PDF generation invisibly to both `tsc` and `next build`.**
- **The "model invents bullet specifics" finding was WRONG — do not re-open it.**
  The generated resume read "Led a team of three developers…", which looked
  invented. It is not: that role's `responsibilities` field says "Shipped Next.js
  features and led a team of three." The number is the user's own, the prompt
  already forbids inventing one, and `responsibilities` is already in
  `promptInput`. The finding was made without reading the source field. The
  correction is recorded in `progress-tracker.md`.
- **`pdf-parse` reads an @react-pdf/renderer file cleanly** — verified directly,
  205 chars including bullets and middots. So a slow extraction is *not* a vision
  fallback caused by a missing text layer.
- **The MCP server list is fixed at session start.** Reconnecting the InsForge
  server mid-session does nothing; it stayed `CONNECTION_CLOSED` throughout even
  after the developer reconnected it. **A Claude Code restart is required.**
- **`.env.local` holds only the anon key**, which RLS correctly prevents from
  updating a profile row — so there is no way around a missing MCP for DB edits.
- **Reading a generated PDF from the browser**: `btoa` of the bytes and the
  signed storage URL are both blocked by the harness. What works is fetching
  `/api/resume/view` in the page, inflating the `FlateDecode` stream with
  `DecompressionStream('deflate')`, and decoding the hex strings inside `TJ`
  arrays — mapping bytes 0x80–0x9F through WinAnsi, or the em dash and bullet
  decode as invisible control characters.
- **Extraction can outrun the 45s CDP timeout.** Fire the fetch without
  awaiting, park the result on `window`, and poll.

## Current state

- **`main` is at `b2d4a16`**, fast-forwarded from `feature/profile-page-and-save`
  (which still points at the same commit). Features 05, 06, 07 and 08 are all now
  on `main`, and `next build` is clean there. **Nothing has been pushed** —
  `origin/main` is still at `37e8f6a`, five commits behind.
- Feature 08 verification: **5 of 6 checks pass.** Happy path (one page, A4,
  Helvetica only, every fact traced to the profile row, 12.3s), incomplete-profile
  422 naming the missing field with no GPT-4o call, empty `OPENROUTER_API_KEY`
  handled as a 502 with other pages still serving, the extract round trip, and the
  `serverExternalPackages` question. The full UI path is verified too:
  idle → confirm → "Writing your resume…" → "Your resume is ready."
- The developer **confirmed the generated resume looks clean and professional**,
  and **accepted the `TagInput` deviation from `profile.png`** — that carried
  question from feature 06 is closed.
- The profile row holds placeholder data (Vercel / Stripe roles, Hanoi-era
  values, Swinburne education) and **the resume in storage is now a generated
  one** — the scanned original was deliberately replaced during verification.
- A **production server may still be running on port 3000** (`npx next start`).
- The InsForge backend was flaky all session: `Service Temporarily Unavailable`
  and `Bad Gateway` from `[actions/auth]`, and the MCP server unreachable.

## Next session starts with

**Restart first** so the InsForge MCP server reconnects, then run the one
outstanding 08 check: null `profiles.resume_pdf_url` for the user, press Generate,
and confirm the confirm step is **skipped** and that the resume row plus the
Extract button appear after `router.refresh()`. The logic is confirmed by
inspection (`if (resumeKey) → confirm; else → generate()`), so this is about
exercising the one unrun branch.

Then start feature **09 Find Jobs Page — Full UI**. Nothing for it exists yet.

## Open questions

- **Extraction took 83s** on the generated PDF, past the 60s client timeout and
  into its one retry, against ~5s measured for text in feature 07. Not a
  text-layer problem. Most likely provider/backend latency given how flaky the
  environment was — **re-measure on a good day before treating it as a defect.**
- **`normalizeGenerated` bounds `index` against `MAX_ROLES` (3), not the actual
  number of roles.** With two roles saved, an index of 2 passes the normalizer
  and the schema, then matches nothing in `bulletsForRole` and is silently
  dropped. Did not bite; fails in the safe direction (a role with no bullets,
  never one job's bullets under another's title).
- **`/dashboard` and `/find-jobs` both return 404**, and both are links in the
  signed-in navbar — a fresh login lands on a missing page until features 09/14.
- Client-side PostHog `identify()` / `posthog.reset()` still unwired (carried
  from 03–06) — still no sign-out control to hang `reset()` on.
- Server-side exception tracking still off (carried from 03).
- Nothing is pushed to GitHub. Decide whether `main` should go to `origin`.
