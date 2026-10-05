import { after, NextResponse, type NextRequest } from "next/server";

import { discoverJobs } from "@/agent/adzuna";
import { trackJobSearchStarted, trackJobsFound } from "@/lib/analytics";
import { createInsforgeServer } from "@/lib/insforge-server";
import { jobSearchRequestSchema } from "@/lib/job-search";
import { getCurrentProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-completion";
import {
  JOB_SEARCH_ERROR,
  SESSION_EXPIRED_ERROR,
  profileIncompleteError,
} from "@/lib/utils";

/**
 * A search is bounded at about 30 seconds (Adzuna 10s, then the slowest of the
 * parallel scores at JOB_SCORE_TIMEOUT_MS), plus database writes and the
 * PostHog flush in `after()`, which runs inside the same budget. 60 leaves
 * headroom without letting a stuck request run on.
 */
export const maxDuration = 60;

/**
 * Runs one job search for the caller: Adzuna, GPT-4o scoring, and the writes to
 * `agent_runs` and `jobs`. Synchronous — the response is the run's summary,
 * returned once every job is saved.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate before reading the body: everything below spends Adzuna
    // quota and up to ten GPT-4o calls.
    const result = await getCurrentProfile();

    if (result.status === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: SESSION_EXPIRED_ERROR },
        { status: 401 },
      );
    }
    if (result.status === "error") {
      return NextResponse.json(
        { success: false, error: JOB_SEARCH_ERROR },
        { status: 500 },
      );
    }

    const raw: unknown = await request.json().catch(() => null);
    const body = jobSearchRequestSchema.safeParse(raw);
    if (!body.success) {
      // Field messages are written for people; anything structural (not an
      // object, wrong types) is Zod's own wording and stays generic.
      const message =
        typeof raw === "object" && raw !== null
          ? body.error.issues[0]?.message
          : undefined;
      return NextResponse.json(
        { success: false, error: message ?? "Invalid search request." },
        { status: 400 },
      );
    }

    const { profile } = result;

    // Scores against an empty profile mean nothing, and would be saved as if
    // they did.
    const completion = getProfileCompletion(profile);
    if (!completion.isComplete) {
      return NextResponse.json(
        {
          success: false,
          error: profileIncompleteError(
            completion.missingFields,
            "searching for jobs",
          ),
        },
        { status: 422 },
      );
    }

    const { jobTitle, location } = body.data;

    // Analytics never holds the user's request: posthog-node's shutdown waits
    // on a network flush, which PostHog has been seen to time out on.
    const startedAt = new Date();
    after(() =>
      trackJobSearchStarted(profile.id, jobTitle, location, startedAt),
    );

    const insforge = await createInsforgeServer();
    const discovery = await discoverJobs(insforge, {
      userId: profile.id,
      profile,
      jobTitle,
      location,
    });

    // The agent's error is for agent_logs; the user gets the generic one.
    if (!discovery.success) {
      return NextResponse.json(
        { success: false, error: JOB_SEARCH_ERROR },
        { status: 500 },
      );
    }

    const { scores, ...summary } = discovery.data;
    after(() => trackJobsFound(profile.id, scores));

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("[api/agent/find]", error);
    return NextResponse.json(
      { success: false, error: JOB_SEARCH_ERROR },
      { status: 500 },
    );
  }
}
