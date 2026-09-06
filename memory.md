# Memory — 04 Database Schema

Last updated: 2026-09-06

## What was built

- **`db/schema.sql`** (new folder, new file) — the complete idempotent DDL and the **source of truth** for the InsForge schema. Executed via the `run-raw-sql` MCP tool in three chunks (tables → indexes/triggers/function/backfill → RLS/policies/revokes). Never edit the backend directly; edit this file and re-run it.
- **Four tables created in InsForge `public`**, matching `context/architecture.md` exactly: `profiles` (24 cols), `agent_runs` (8), `jobs` (23), `agent_logs` (7).
- **RLS on all four** — `enable row level security` (never `force`), one `for all to authenticated using (<owner> = auth.uid()) with check (<owner> = auth.uid())` policy each (`profiles` scoped on `id`, the rest on `user_id`), plus an explicit `revoke all ... from anon`.
- **`public.handle_new_user()`** — `SECURITY DEFINER` trigger (`after insert on auth.users`), pinned `search_path`, skips `is_anonymous`, `on conflict (id) do nothing`. Copies `id`, `email`, and `full_name` from `auth.users.profile ->> 'name'` into a new `profiles` row. Plus a one-time backfill that gave the one pre-existing account its row.
- **`public.set_updated_at()`** + `profiles_set_updated_at` BEFORE UPDATE trigger. Written locally rather than reusing InsForge's `system.update_updated_at()` to keep `schema.sql` self-contained.
- **7 indexes** — composites lead with `user_id` so one index serves both the user filter and the sort: `agent_runs (user_id, started_at desc)`, `jobs (user_id, found_at desc)`, `jobs (user_id, match_score desc)`; plain FK indexes on `jobs.run_id`, `agent_logs.run_id`, `agent_logs.user_id`, `agent_logs.job_id`.
- **`resumes` storage bucket created private** (`isPublic: false`) via the `create-bucket` MCP tool.
- **Docs updated** — `context/architecture.md` (folder structure now lists `db/`, plus a new **InsForge Database & RLS Pattern** section); `context/library-docs.md` (RLS note on the DB section, drift warning on the storage section); `context/progress-tracker.md` (04 marked done, full decision log, verification log, and a "deferred, not built" list).

## Decisions made

- **RLS is the only thing protecting the data.** InsForge default privileges (`pg_default_acl`) auto-grant **both `anon` and `authenticated` full CRUD** on every new `public` table. A table created without RLS is world-readable/writable by anyone holding the publishable anon key. This is now a written rule in `architecture.md` for every future table.
- **`enable row level security`, never `force`.** Forcing would apply policies to `project_admin` too, breaking the `SECURITY DEFINER` signup trigger and the InsForge admin MCP tooling, both of which rely on the owner's RLS bypass.
- **Signup trigger provisions `profiles`**, chosen over a lazy upsert in feature 06. The schema already assumes a profile row exists, and `authenticated` cannot select `auth.users` through PostgREST so email/name must be copied in regardless. Every user is now guaranteed exactly one profile row — no feature needs "no row yet" handling, and profile reads can use `.single()`.
- **FK cascades** — `profiles.id → auth.users on delete cascade`; the three `user_id` columns → `profiles(id) on delete cascade`; `jobs.run_id → agent_runs on delete set null` (null is already valid for URL-sourced jobs, and jobs outlive their run); `agent_logs.run_id → agent_runs on delete cascade`; `agent_logs.job_id → jobs on delete set null`.
- **CHECK constraints only where our own code controls the value** — `jobs.source`, `agent_runs.status`, `agent_logs.level`, `jobs.match_score` (0–100), `agent_runs.jobs_found` (>= 0). Deliberately **not** on `profiles.experience_level` / `remote_preference` / `work_authorization` / `cover_letter_tone` or `jobs.job_type`, which GPT-4o extraction and user dropdowns populate — those get Zod validation instead, so a stray model output is a validation error not a 500.
- **`resumes` bucket is private.** Matches "authenticated users only, own files only".
- **New `db/` folder is a deviation** from `architecture.md`'s documented structure — logged, and `architecture.md` updated to match.

## Problems solved

- **`SET ROLE` is blocked by the `run-raw-sql` MCP tool** ("Changing SQL execution role or session authorization is not allowed"), so RLS cannot be tested by impersonation in SQL. Worked around by testing over real HTTP against the live backend — register a user via `POST /api/auth/users`, flip `email_verified` via SQL, log in via `POST /api/auth/sessions`, then hit `/api/database/records/<table>`. Remember this for any future policy work.
- **`library-docs.md`'s storage section is drifted** — `getPublicUrl()` does not exist on the installed SDK (`@insforge/sdk` 1.5.2); the real surface is `upload(path, file)` / `uploadAuto(file)` / `download(path) -> Blob` / `remove(path)`, and there is no `upsert` option (uploading to an existing key just replaces it). Same class of drift as the `@insforge/ssr` package that turned out not to exist. Flagged inline with a warning block rather than rewritten — the correct pattern gets settled when feature 06/08 builds the upload path.
- **Access tokens live 15 minutes**, not the ~1h assumed (measured `exp - iat` on a real token). Fine for a 2-minute Browserbase session, but nothing longer-running can assume the caller's token is still valid.
- **InsForge stores the signup name at `auth.users.profile ->> 'name'`** — confirmed against the real auth API, not guessed, which is what makes the trigger's `full_name` copy work.
- **InsForge internals confirmed by introspection:** `auth.uid()` / `auth.jwt()` / `auth.role()` all read `request.jwt.claims`; roles are `anon` / `authenticated` / `project_admin` (bypassrls) / `postgres`; `run-raw-sql` connects as `project_admin`; PostgREST schema exposure auto-syncs via the `insforge_sync_postgrest_schemas` event trigger, so no manual config after a `create table`.

## Current state

Feature 04 is complete and **verified against the live backend over real HTTP**, not just introspected:

- Unauthenticated caller with the real anon key → `401 / 42501 permission denied` on all four tables, both select and insert.
- Real signup through the auth API → `profiles` row auto-created with correct `full_name`.
- Authenticated caller (real JWT, `role: authenticated`) → sees only own rows (1 of 2 jobs, 1 of 4 profiles); another user's profile returns `[]`; cross-tenant insert rejected `403` "new row violates row-level security policy"; own insert `201`.
- CHECK enforced end-to-end: `source: "linkedin"` → `400 / 23514 jobs_source_check`.
- All probe users/rows deleted afterward; cascades confirmed clean (`jobs`, `agent_runs`, `agent_logs` all back to 0).

Backend now holds 4 tables + the private `resumes` bucket. One real account exists (the project owner) with a backfilled `profiles` row whose `full_name` is null — the backfill only copies id and email.

**Nothing is committed.** `db/schema.sql` is new and untracked; the three `context/*.md` files are modified. No app code changed this session, so no build/typecheck was needed.

## Next session starts with

Feature **05 Profile Page — Full UI** (per `build-plan.md`): build the complete profile page UI with **mock data only, no save logic**. Needs the "profile needs attention" banner with a completion ring and missing-field tags; the resume drag-and-drop upload area with Select Resume + Generate Resume from Profile buttons; and the Profile Information form in five labeled sections (Personal Info, Professional Info, Work Experience up to 3 roles, Education, Job Preferences) with a Save Profile button. There is a design asset in `context/designs/` for most pages — check whether one exists for the profile page before building (the login page had none and was built from `ui-tokens.md` conventions).

Run `/architect` first — it caught three real spec mismatches this session.

## Open questions

- **`allowedRedirectUrls` is still empty on the InsForge backend** (carried from feature 02, dashboard-only, no MCP tool). Still blocks a real end-to-end OAuth login. **But note:** an auth user for the project owner's email exists, created 2026-09-06 06:08 — so either it was created through the InsForge dashboard, or an OAuth login did complete. Worth clarifying, since it affects whether feature 03's `signed_in` / server `identify()` have ever actually fired.
- **Three `build-plan.md` ↔ `architecture.md` mismatches**, resolved in `architecture.md`'s favour and deferred to the features that hit them: (1) build-plan 04's "tailored fields" on `jobs` have no schema counterpart and no feature produces them — omitted, though feature 14 still shows a "Cover Letters Generated" stat card with no data source; (2) build-plan 06 says completion percentage and missing fields are "saved" but `profiles` has only `is_complete` — feature 06 must either compute at render or add the columns; (3) build-plan 16 sorts activity by `created_at`, which `agent_runs` does not have — use `started_at`.
- **InsForge's per-object "own files only" enforcement for private buckets is unverified.** Feature 06/08 must derive every storage path from the session user id server-side rather than relying on it.
- **Client-side `identify()` on refresh and `posthog.reset()` on logout are still not implemented** (carried from feature 03) — both need UI that does not exist yet. Do this in the first feature that adds an authenticated Client Component, and wire `tracing_headers` / `X-POSTHOG-DISTINCT-ID` then so anonymous client events correlate with server events.
- **Server-side exception tracking is off** (carried from feature 03). If wanted, it needs a singleton `posthog-node` client created once at process start — never the per-request one.
