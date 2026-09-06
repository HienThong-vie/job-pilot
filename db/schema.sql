-- JobPilot — feature 04 Database Schema
--
-- Source of truth for the InsForge/Postgres schema. Executed with the InsForge
-- `run-raw-sql` MCP tool, which connects as `project_admin` (owns what it
-- creates, bypasses RLS). Re-runnable: every statement is idempotent.
--
-- SECURITY — read before adding a table here.
-- InsForge default privileges (pg_default_acl) auto-grant BOTH `anon` and
-- `authenticated` full CRUD on every new table in `public`. RLS is therefore
-- the only barrier between an unauthenticated request and every row — not
-- defence in depth. A table added without `enable row level security` and an
-- owner policy is world-readable and world-writable through PostgREST.


-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text,
  email               text,
  phone               text,
  location            text,
  current_title       text,
  experience_level    text,
  years_experience    integer,
  skills              text[]      not null default '{}',
  industries          text[]      not null default '{}',
  work_experience     jsonb       not null default '[]'::jsonb,
  education           jsonb       not null default '{}'::jsonb,
  job_titles_seeking  text[]      not null default '{}',
  remote_preference   text,
  preferred_locations text[]      not null default '{}',
  salary_expectation  text,
  cover_letter_tone   text,
  linkedin_url        text,
  portfolio_url       text,
  work_authorization  text,
  resume_pdf_url      text,
  is_complete         boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid        not null references public.profiles (id) on delete cascade,
  status             text        not null default 'running'
                                 check (status in ('running', 'completed', 'failed')),
  job_title_searched text,
  location_searched  text,
  jobs_found         integer     not null default 0 check (jobs_found >= 0),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);

-- run_id is null for jobs added from a pasted URL rather than a search run.
-- company_research is null until the research agent has run — feature 15 counts
-- researched companies with `company_research is not null`, so it must stay
-- nullable with no default.
create table if not exists public.jobs (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid        references public.agent_runs (id) on delete set null,
  user_id            uuid        not null references public.profiles (id) on delete cascade,
  source             text        not null check (source in ('search', 'url')),
  source_url         text,
  external_apply_url text,
  title              text,
  company            text,
  location           text,
  salary             text,
  job_type           text,
  about_role         text,
  responsibilities   text[]      not null default '{}',
  requirements       text[]      not null default '{}',
  nice_to_have       text[]      not null default '{}',
  benefits           text[]      not null default '{}',
  about_company      text,
  match_score        integer     check (match_score between 0 and 100),
  match_reason       text,
  matched_skills     text[]      not null default '{}',
  missing_skills     text[]      not null default '{}',
  company_research   jsonb,
  found_at           timestamptz not null default now()
);

create table if not exists public.agent_logs (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid        references public.agent_runs (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  message    text        not null,
  level      text        not null default 'info'
                         check (level in ('info', 'success', 'warning', 'error')),
  job_id     uuid        references public.jobs (id) on delete set null,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 2. Indexes
--
-- Postgres does not index foreign keys automatically; the referencing side of
-- every `on delete cascade` / `set null` needs one. The composites lead with
-- user_id, so they serve plain `where user_id = ...` lookups too.
-- ---------------------------------------------------------------------------

create index if not exists agent_runs_user_started_idx on public.agent_runs (user_id, started_at desc);
create index if not exists jobs_user_found_at_idx      on public.jobs (user_id, found_at desc);
create index if not exists jobs_user_match_score_idx   on public.jobs (user_id, match_score desc);
create index if not exists jobs_run_id_idx             on public.jobs (run_id);
create index if not exists agent_logs_run_id_idx       on public.agent_logs (run_id);
create index if not exists agent_logs_user_id_idx      on public.agent_logs (user_id);
create index if not exists agent_logs_job_id_idx       on public.agent_logs (job_id);


-- ---------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Every user gets exactly one profiles row at signup, so no downstream feature
-- has to handle "no row yet". `authenticated` cannot select auth.users through
-- PostgREST, so email and name are copied in here.
-- security definer: writes to public.profiles past its RLS policy.
-- search_path is pinned — a security definer function otherwise inherits the
-- caller's path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_anonymous then
    return new;
  end if;

  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.profile ->> 'name', new.profile ->> 'full_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
where not u.is_anonymous
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 4. Row level security
--
-- `enable`, never `force` — forcing would also apply these policies to
-- project_admin, breaking both the security definer trigger above and the
-- InsForge admin tooling.
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.agent_runs enable row level security;
alter table public.jobs       enable row level security;
alter table public.agent_logs enable row level security;

drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists agent_runs_owner on public.agent_runs;
create policy agent_runs_owner on public.agent_runs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists jobs_owner on public.jobs;
create policy jobs_owner on public.jobs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists agent_logs_owner on public.agent_logs;
create policy agent_logs_owner on public.agent_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No table here is ever read by a signed-out visitor. Revoking leaves anon
-- blocked even if a future permissive policy is added by mistake.
revoke all on public.profiles   from anon;
revoke all on public.agent_runs from anon;
revoke all on public.jobs       from anon;
revoke all on public.agent_logs from anon;
