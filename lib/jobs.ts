import { z } from "zod";

import { createInsforgeServer } from "@/lib/insforge-server";
import type { JobFilters } from "@/lib/job-filters";
import { JOBS_PAGE_SIZE, MATCH_THRESHOLD } from "@/lib/utils";
import type { JobDetail, JobListRow } from "@/types";

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
  found_at: string;
};

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
      "id, company, title, match_score, match_reason, matched_skills, missing_skills, salary, location, job_type, about_role, source_url, external_apply_url, found_at",
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
    },
  };
}
