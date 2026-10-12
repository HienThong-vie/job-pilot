import type { InsForgeClient } from "@insforge/sdk";
import { z } from "zod";

import { companyDossierSchema } from "@/lib/company-dossier";
import { buildDashboardStats, type JobStatsRow } from "@/lib/dashboard-stats";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { JobFilters } from "@/lib/job-filters";
import { JOBS_PAGE_SIZE, MATCH_THRESHOLD } from "@/lib/utils";
import type {
  CompanyDossier,
  DashboardStat,
  JobDetail,
  JobListRow,
} from "@/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * "2 hours ago" / "Yesterday" / "3 days ago", then a plain date once a week
 * old — past that, the exact day reads better than a growing count.
 */
export function formatFoundAt(foundAt: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(foundAt).getTime();

  if (elapsed < HOUR_MS) return "Just now";
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (elapsed < 2 * DAY_MS) return "Yesterday";
  if (elapsed < 7 * DAY_MS) return `${Math.floor(elapsed / DAY_MS)} days ago`;

  return new Date(foundAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type JobRow = {
  id: string;
  company: string | null;
  title: string | null;
  match_score: number | null;
  salary: string | null;
  found_at: string;
};

export type JobsResult =
  | { status: "ok"; jobs: JobListRow[]; total: number }
  | { status: "unauthenticated" }
  | { status: "error" };

// PostgREST answers a range that starts past the last row with this code rather
// than an empty list.
const RANGE_NOT_SATISFIABLE = "PGRST103";

/**
 * A free-text filter as a PostgREST `or` expression over company and title.
 *
 * The value is double-quoted because commas and parentheses are the `or`
 * grammar's own punctuation — an unquoted "Acme, Inc" would split in two. The
 * characters that would break out of the quotes or act as wildcards are
 * dropped, which costs nothing a person types into a company search.
 */
function textFilter(query: string): string | null {
  const text = query.replace(/[%\\"*]/g, " ").trim();
  if (!text) return null;
  return `company.ilike."*${text}*",title.ilike."*${text}*"`;
}

/**
 * One page of the signed-in user's jobs, filtered and sorted, with the total
 * matching the filter for the pagination line.
 */
export async function getJobs(filters: JobFilters): Promise<JobsResult> {
  const insforge = await createInsforgeServer();
  const { data: session } = await insforge.auth.getCurrentUser();
  if (!session.user) return { status: "unauthenticated" };

  const from = (filters.page - 1) * JOBS_PAGE_SIZE;

  let query = insforge.database
    .from("jobs")
    .select("id, company, title, match_score, salary, found_at", {
      count: "exact",
    })
    .eq("user_id", session.user.id);

  const text = textFilter(filters.query);
  if (text) query = query.or(text);

  // Discovery only saves a job it managed to score, so the column is never null
  // in practice. A second `.or()` for nulls would also collide with the text
  // filter's: PostgREST rejects a repeated `or` parameter.
  if (filters.match === "high") {
    query = query.gte("match_score", MATCH_THRESHOLD);
  } else if (filters.match === "low") {
    query = query.lt("match_score", MATCH_THRESHOLD);
  }

  // `id` last makes the order total, so a row never lands on two pages or none
  // when scores or timestamps tie.
  if (filters.sort === "score") {
    query = query
      .order("match_score", { ascending: false, nullsFirst: false })
      .order("found_at", { ascending: false });
  } else {
    query = query.order("found_at", { ascending: filters.sort === "oldest" });
  }
  query = query.order("id");

  const { data, error, count } = await query.range(
    from,
    from + JOBS_PAGE_SIZE - 1,
  );

  if (error?.code === RANGE_NOT_SATISFIABLE) {
    // Past the last page: the caller needs the total to know where the last one is.
    const { count: total, error: countError } = await query.range(0, 0);
    if (countError) {
      console.error("[lib/jobs] getJobs count", countError);
      return { status: "error" };
    }
    return { status: "ok", jobs: [], total: total ?? 0 };
  }
  if (error) {
    console.error("[lib/jobs] getJobs", error.code, error.message);
    return { status: "error" };
  }

  const now = new Date();
  const jobs = (data as JobRow[]).map((row) => ({
    id: row.id,
    company: row.company ?? "Unknown company",
    title: row.title ?? "Untitled role",
    match_score: row.match_score ?? 0,
    salary: row.salary,
    found_at_label: formatFoundAt(row.found_at, now),
  }));

  return { status: "ok", jobs, total: count ?? jobs.length };
}

type JobDetailRow = {
  id: string;
  company: string | null;
  title: string | null;
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  salary: string | null;
  location: string | null;
  job_type: string | null;
  about_role: string | null;
  source_url: string | null;
  external_apply_url: string | null;
  company_research: unknown;
  found_at: string;
};

/**
 * The stored dossier, or null. A row written by an older shape fails the
 * schema and reads as "not researched yet", so the card offers a fresh run
 * instead of the page throwing.
 */
function parseDossier(value: unknown): CompanyDossier | null {
  if (value === null || value === undefined) return null;
  const parsed = companyDossierSchema.safeParse(value);
  if (!parsed.success) {
    console.error("[lib/jobs] stored dossier", parsed.error.message);
    return null;
  }
  return parsed.data;
}

export type JobResult =
  | { status: "ok"; job: JobDetail }
  | { status: "not_found" }
  | { status: "unauthenticated" }
  | { status: "error" };

const JOB_TYPE_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contract: "Contract",
};

const jobIdSchema = z.uuid();

/**
 * One of the signed-in user's jobs, by id. A malformed id is "not found"
 * rather than an error: PostgREST would reject it with a 400 for a uuid
 * column, and a mistyped URL is not a server fault.
 */
export async function getJob(id: string): Promise<JobResult> {
  if (!jobIdSchema.safeParse(id).success) return { status: "not_found" };

  const insforge = await createInsforgeServer();
  const { data: session } = await insforge.auth.getCurrentUser();
  if (!session.user) return { status: "unauthenticated" };

  const { data, error } = await insforge.database
    .from("jobs")
    .select(
      "id, company, title, match_score, match_reason, matched_skills, missing_skills, salary, location, job_type, about_role, source_url, external_apply_url, company_research, found_at",
    )
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[lib/jobs] getJob", error.code, error.message);
    return { status: "error" };
  }
  if (!data) return { status: "not_found" };

  const row = data as JobDetailRow;
  // Both links are Adzuna's tracked redirect today; either may be the only
  // one a future source fills in.
  const link = row.external_apply_url ?? row.source_url;

  return {
    status: "ok",
    job: {
      id: row.id,
      company: row.company ?? "Unknown company",
      title: row.title ?? "Untitled role",
      match_score: row.match_score ?? 0,
      match_reason: row.match_reason,
      matched_skills: row.matched_skills ?? [],
      missing_skills: row.missing_skills ?? [],
      salary: row.salary,
      location: row.location,
      job_type_label: row.job_type
        ? (JOB_TYPE_LABELS[row.job_type] ?? row.job_type)
        : null,
      description: row.about_role,
      found_at_label: formatFoundAt(row.found_at),
      view_url: row.source_url ?? link,
      apply_url: link,
      company_research: parseDossier(row.company_research),
    },
  };
}

export type JobStatsResult =
  | { status: "ok"; stats: DashboardStat[] }
  | { status: "unauthenticated" }
  | { status: "error" };

// Rows per request. A server may cap a response below this, so the loop in
// getJobStats pages on the exact count rather than trusting one response to be
// complete.
const STATS_PAGE_SIZE = 1000;

type StatsPage = {
  rows: JobStatsRow[];
  count: number | null;
  error: { code: string; message: string } | null;
};

async function readStatsPage(
  insforge: InsForgeClient,
  userId: string,
  from: number,
): Promise<StatsPage> {
  const { data, count, error } = await insforge.database
    .from("jobs")
    .select("found_at, match_score", { count: "exact" })
    .eq("user_id", userId)
    // `id` last makes the order total, so paging never repeats or skips a row.
    .order("found_at", { ascending: false })
    .order("id")
    .range(from, from + STATS_PAGE_SIZE - 1);

  // The select above names exactly these two columns.
  return { rows: (data ?? []) as JobStatsRow[], count, error };
}

/**
 * The dashboard's four stat cards for the signed-in user.
 *
 * The researched count comes from `count: "exact"`. The average and both
 * trends need the scores and dates themselves, so those are read as two small
 * columns and reduced in `buildDashboardStats`.
 */
export async function getJobStats(): Promise<JobStatsResult> {
  const insforge = await createInsforgeServer();
  const { data: session } = await insforge.auth.getCurrentUser();
  if (!session.user) return { status: "unauthenticated" };
  const userId = session.user.id;

  const [first, researched] = await Promise.all([
    readStatsPage(insforge, userId, 0),
    insforge.database
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("company_research", "is", null),
  ]);

  const failure = first.error ?? researched.error;
  if (failure) {
    console.error("[lib/jobs] getJobStats", failure.code, failure.message);
    return { status: "error" };
  }

  const rows = [...first.rows];
  const total = first.count ?? rows.length;

  for (let from = STATS_PAGE_SIZE; from < total; from += STATS_PAGE_SIZE) {
    const page = await readStatsPage(insforge, userId, from);
    if (page.error) {
      console.error("[lib/jobs] getJobStats page", page.error.code, page.error.message);
      return { status: "error" };
    }
    rows.push(...page.rows);
  }

  return {
    status: "ok",
    stats: buildDashboardStats(rows, researched.count ?? 0),
  };
}

/** What the research agent needs from a job — `build-plan.md` 13. */
export type ResearchJob = {
  id: string;
  company: string;
  title: string;
  description: string | null;
  matched_skills: string[];
  missing_skills: string[];
  /** The saved listing link — Adzuna's tracked redirect for searched jobs. */
  link: string | null;
  /** The dossier already saved, if any — a failed re-run must not replace it. */
  saved_research: CompanyDossier | null;
};

export type ResearchJobResult =
  | { status: "ok"; job: ResearchJob }
  | { status: "not_found" }
  | { status: "error" };

/**
 * One job for the research agent, scoped to the user. Takes the route's client
 * and user id rather than reading the session again: the route has already
 * authenticated, and the agent writes back through the same client.
 */
export async function getResearchJob(
  insforge: InsForgeClient,
  userId: string,
  id: string,
): Promise<ResearchJobResult> {
  const { data, error } = await insforge.database
    .from("jobs")
    .select(
      "id, company, title, about_role, matched_skills, missing_skills, source_url, external_apply_url, company_research",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[lib/jobs] getResearchJob", error.code, error.message);
    return { status: "error" };
  }
  if (!data) return { status: "not_found" };

  const row = data as Pick<
    JobDetailRow,
    | "id"
    | "company"
    | "title"
    | "about_role"
    | "matched_skills"
    | "missing_skills"
    | "source_url"
    | "external_apply_url"
    | "company_research"
  >;

  return {
    status: "ok",
    job: {
      id: row.id,
      company: row.company ?? "Unknown company",
      title: row.title ?? "Untitled role",
      description: row.about_role,
      matched_skills: row.matched_skills ?? [],
      missing_skills: row.missing_skills ?? [],
      // The apply link is the likelier of the two to be the employer's own.
      link: row.external_apply_url ?? row.source_url,
      saved_research: parseDossier(row.company_research),
    },
  };
}
