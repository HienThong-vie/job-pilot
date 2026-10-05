import { z } from "zod";

import {
  JOB_SEARCH_ERROR,
  MAX_FIELD_LENGTH,
  SESSION_EXPIRED_ERROR,
} from "@/lib/utils";

/**
 * The Find Jobs request and response contract. Both the route and the search
 * form use it, so it lives in `lib/` rather than in either one.
 */

export const jobSearchRequestSchema = z.object({
  jobTitle: z
    .string({ error: "Enter a job title to search for." })
    .trim()
    .min(1, "Enter a job title to search for.")
    .max(MAX_FIELD_LENGTH, "That job title is too long."),
  location: z
    .string({ error: "Enter the location as text." })
    .trim()
    .max(MAX_FIELD_LENGTH, "That location is too long.")
    .default(""),
});

export type JobSearchRequest = z.infer<typeof jobSearchRequestSchema>;

const summarySchema = z.object({
  found: z.number(),
  saved: z.number(),
  skipped: z.number(),
  notScored: z.number(),
  failed: z.number(),
  strongMatches: z.number(),
});

export type JobSearchSummary = z.infer<typeof summarySchema>;

const responseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: summarySchema }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type JobSearchResult =
  | { status: "ok"; summary: JobSearchSummary }
  | { status: "error"; message: string };

export async function requestJobSearch(
  input: JobSearchRequest,
): Promise<JobSearchResult> {
  try {
    const response = await fetch("/api/agent/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    // The proxy sends an expired session to /login, which fetch follows — so
    // this arrives as a 200 of HTML rather than as the route's own 401.
    if (response.redirected) {
      return { status: "error", message: SESSION_EXPIRED_ERROR };
    }

    const body = responseSchema.safeParse(await response.json());

    if (!body.success) {
      console.error("[lib/job-search] response shape", body.error);
      return { status: "error", message: JOB_SEARCH_ERROR };
    }
    if (!body.data.success) {
      return { status: "error", message: body.data.error };
    }

    return { status: "ok", summary: body.data.data };
  } catch (error) {
    console.error("[lib/job-search] requestJobSearch", error);
    return { status: "error", message: JOB_SEARCH_ERROR };
  }
}

/** The result banner's text. */
export function describeSearch(summary: JobSearchSummary): string {
  const outcome = describeOutcome(summary);
  const { failed } = summary;

  // Saved jobs are real, so a partial failure is still a success banner — but
  // it must not read as though the missing jobs were judged and discarded.
  return failed > 0
    ? `${outcome} ${failed} ${failed === 1 ? "job" : "jobs"} couldn't be scored this time — search again to retry.`
    : outcome;
}

function describeOutcome({
  found,
  saved,
  skipped,
  notScored,
  strongMatches,
}: JobSearchSummary): string {
  // An unrecognised place falls back to a US search and comes back empty — so
  // name the coverage, or "Vietnam" reads as "no jobs in Vietnam".
  if (found === 0) {
    return "No jobs found for that search. Try a broader title or location — job search covers the US, UK, Canada and Australia.";
  }

  const jobs = `${found} ${found === 1 ? "job" : "jobs"}`;
  const already = skipped > 0 ? ` (${skipped} already saved)` : "";
  const matches = `${strongMatches} strong ${strongMatches === 1 ? "match" : "matches"}`;

  // More new jobs than one search scores: say how many were kept, or a table
  // of ten under "Found 34 jobs" looks like twenty-four went missing.
  if (notScored > 0) {
    return `Found ${jobs}${already} — saved the ${saved} most relevant, ${matches}.`;
  }
  // Skipped jobs are not re-scored, so the count only covers the new ones —
  // say so, or "0 strong matches" reads as a verdict on all of them.
  if (skipped > 0) {
    return `Found ${jobs}${already} — ${strongMatches} new strong ${strongMatches === 1 ? "match" : "matches"}.`;
  }
  return `Found ${jobs} — ${matches}.`;
}
