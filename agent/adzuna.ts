import type { InsForgeClient } from "@insforge/sdk";

import { logAgent } from "@/agent/agent-logs";
import { scoreJob } from "@/agent/matcher";
import {
  collapseCopies,
  listingKey,
  searchAdzuna,
  type JobListing,
} from "@/lib/adzuna";
import { MATCH_THRESHOLD, MAX_SCORED_PER_SEARCH } from "@/lib/utils";
import type { Profile } from "@/types";

type DiscoverInput = {
  userId: string;
  profile: Profile;
  jobTitle: string;
  location: string;
};

export type DiscoverySummary = {
  /** Distinct jobs Adzuna returned, after syndicated copies are collapsed. */
  found: number;
  /** New rows written to `jobs` — what `agent_runs.jobs_found` records. */
  saved: number;
  /** Jobs this user already had, by id or by content, skipped before scoring. */
  skipped: number;
  /** New jobs past MAX_SCORED_PER_SEARCH, left unscored. */
  notScored: number;
  /** Jobs sent to GPT-4o whose scoring failed — logged and not saved. */
  failed: number;
  strongMatches: number;
  /** One per saved job, for the `job_found` events. */
  scores: number[];
};

export type DiscoverResult =
  | { success: true; data: DiscoverySummary }
  | { success: false; error: string };

/**
 * Well past the route's 60-second maxDuration: a run still `running` after
 * this belongs to a request that died — a crash, a platform timeout, or a final
 * status update that failed twice. Nothing else will ever close it.
 */
const STALE_RUN_MS = 5 * 60 * 1000;

/**
 * Closes the user's abandoned runs as `failed` so the dashboard's recent
 * activity never shows a run that runs forever. Best-effort: a failure here
 * must not stop the new search.
 */
async function closeStaleRuns(
  insforge: InsForgeClient,
  userId: string,
): Promise<void> {
  const { data, error } = await insforge.database
    .from("agent_runs")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - STALE_RUN_MS).toISOString())
    .select("id");

  if (error) {
    console.error("[agent/adzuna] close stale runs", error);
    return;
  }

  for (const { id } of (data ?? []) as { id: string }[]) {
    await logAgent(insforge, {
      userId,
      runId: id,
      level: "error",
      message: "Run never finished and was closed as failed by a later search.",
    });
  }
}

const markRunCompleted = (
  insforge: InsForgeClient,
  userId: string,
  runId: string,
  jobsFound: number,
) =>
  insforge.database
    .from("agent_runs")
    .update({
      status: "completed",
      jobs_found: jobsFound,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("user_id", userId)
    .select("id")
    .single();

type SavedJobKeys = { ids: Set<string>; keys: Set<string> };

/**
 * What this user already has among the candidates — by Adzuna id, and by
 * content for syndicated copies that arrive under an id we have not seen.
 * Content is looked up by company, which every copy shares, so the query stays
 * bounded by this page rather than by the user's whole history.
 */
async function findSaved(
  insforge: InsForgeClient,
  userId: string,
  listings: JobListing[],
): Promise<{ saved: SavedJobKeys } | { error: string }> {
  const companies = [
    ...new Set(listings.flatMap((listing) => (listing.company ? [listing.company] : []))),
  ];

  const [byId, byCompany] = await Promise.all([
    insforge.database
      .from("jobs")
      .select("external_id")
      .eq("user_id", userId)
      .in(
        "external_id",
        listings.map((listing) => listing.external_id),
      ),
    companies.length > 0
      ? insforge.database
          .from("jobs")
          .select("company, title, about_role")
          .eq("user_id", userId)
          .in("company", companies)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byId.error) return { error: byId.error.message };
  if (byCompany.error) return { error: byCompany.error.message };

  return {
    saved: {
      ids: new Set(
        (byId.data ?? []).map((row: { external_id: string }) => row.external_id),
      ),
      keys: new Set(
        (byCompany.data ?? []).map(
          (row: { company: string | null; title: string | null; about_role: string | null }) =>
            listingKey(row),
        ),
      ),
    },
  };
}

/**
 * One Find Jobs press: search Adzuna, collapse syndicated copies, drop what the
 * user already has, score up to MAX_SCORED_PER_SEARCH of the rest against
 * their profile in parallel, save, and close the run.
 *
 * Every step after the run row exists logs to `agent_logs` against it, and any
 * failure marks the run `failed` — a run never stays `running` because a step
 * returned early. Known jobs are filtered out *before* the cap and before
 * scoring: a repeated search then reaches past the jobs it already saved
 * instead of paying GPT-4o to rediscover them.
 */
export async function discoverJobs(
  insforge: InsForgeClient,
  { userId, profile, jobTitle, location }: DiscoverInput,
): Promise<DiscoverResult> {
  let runId: string | null = null;

  const log = (level: "info" | "success" | "warning" | "error", message: string) =>
    logAgent(insforge, { userId, runId, level, message });

  // Before the run exists there is nothing to mark failed — the error is still
  // logged, with a null run_id.
  const fail = async (message: string): Promise<DiscoverResult> => {
    console.error("[agent/adzuna]", message);
    await log("error", message);

    if (runId) {
      const { error } = await insforge.database
        .from("agent_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", runId)
        .eq("user_id", userId);
      if (error) console.error("[agent/adzuna] mark run failed", error);
    }

    return { success: false, error: message };
  };

  try {
    await closeStaleRuns(insforge, userId);

    const { data: run, error: runError } = await insforge.database
      .from("agent_runs")
      .insert([
        {
          user_id: userId,
          status: "running",
          // Set here rather than left to the column default: completed_at can
          // only come from this process's clock, and mixing it with the
          // database's made runs finish before they started.
          started_at: new Date().toISOString(),
          job_title_searched: jobTitle,
          location_searched: location || null,
        },
      ])
      .select("id")
      .single();

    if (runError || !run) {
      return await fail(
        `Could not start a job search run: ${runError?.message ?? "no row returned"}`,
      );
    }
    runId = run.id as string;

    await log(
      "info",
      `Searching Adzuna for "${jobTitle}"${location ? ` in "${location}"` : ""}.`,
    );

    const search = await searchAdzuna(jobTitle, location);
    if (!search.success) return await fail(search.error);

    const listings = collapseCopies(search.listings);

    let fresh = listings;
    if (listings.length > 0) {
      const lookup = await findSaved(insforge, userId, listings);
      if ("error" in lookup) {
        return await fail(`Could not check saved jobs: ${lookup.error}`);
      }
      fresh = listings.filter(
        (listing) =>
          !lookup.saved.ids.has(listing.external_id) &&
          !lookup.saved.keys.has(listingKey(listing)),
      );
    }

    const skipped = listings.length - fresh.length;
    const toScore = fresh.slice(0, MAX_SCORED_PER_SEARCH);
    const notScored = fresh.length - toScore.length;

    await log(
      "info",
      `Adzuna returned ${search.listings.length} listings, ${listings.length} distinct; ${skipped} already saved, scoring ${toScore.length}.`,
    );

    const scored = await Promise.all(
      toScore.map(async (listing) => ({
        listing,
        score: await scoreJob(profile, listing),
      })),
    );

    const rows = [];
    for (const { listing, score } of scored) {
      if (!score.success) {
        await log(
          "warning",
          `Skipped "${listing.title}" at ${listing.company ?? "unknown company"}: ${score.error}`,
        );
        continue;
      }

      rows.push({
        ...listing,
        user_id: userId,
        run_id: runId,
        source: "search",
        match_score: score.data.matchScore,
        match_reason: score.data.matchReason,
        matched_skills: score.data.matchedSkills,
        missing_skills: score.data.missingSkills,
      });
    }

    let scores: number[] = [];
    if (rows.length > 0) {
      // ignoreDuplicates covers a second run racing this one: whichever saves
      // a listing second skips it rather than failing the whole batch.
      const { data: saved, error: saveError } = await insforge.database
        .from("jobs")
        .upsert(rows, {
          onConflict: "user_id,external_id",
          ignoreDuplicates: true,
        })
        .select("match_score");

      if (saveError) {
        return await fail(`Could not save jobs: ${saveError.message}`);
      }
      scores = (saved ?? []).map(
        (row: { match_score: number }) => row.match_score,
      );
    }

    const strongMatches = scores.filter((score) => score >= MATCH_THRESHOLD).length;

    // One retry, because the jobs are already saved and a run left `running`
    // would otherwise sit there until closeStaleRuns finds it. If both fail,
    // the search itself still succeeded — log it, don't report it to the user.
    let { error: closeError } = await markRunCompleted(
      insforge,
      userId,
      runId,
      scores.length,
    );
    if (closeError) {
      ({ error: closeError } = await markRunCompleted(
        insforge,
        userId,
        runId,
        scores.length,
      ));
    }
    if (closeError) {
      console.error("[agent/adzuna] complete run", closeError);
      await log("error", `Could not mark run completed: ${closeError.message}`);
    }

    await log(
      "success",
      `Saved ${scores.length} new jobs, ${strongMatches} strong matches.`,
    );

    return {
      success: true,
      data: {
        found: listings.length,
        saved: scores.length,
        skipped,
        notScored,
        failed: toScore.length - rows.length,
        strongMatches,
        scores,
      },
    };
  } catch (error) {
    return await fail(`Job discovery crashed: ${String(error)}`);
  }
}
