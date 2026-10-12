import { createPostHogServer } from "@/lib/posthog-server";

type SignInUser = {
  id: string;
  email: string;
  profile: { name?: string } | null;
};

export async function trackServerSignIn(
  user: SignInUser,
  provider: string | undefined,
): Promise<void> {
  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    posthog.identify({
      distinctId: user.id,
      properties: {
        email: user.email,
        name: user.profile?.name,
      },
    });

    posthog.capture({
      distinctId: user.id,
      event: "signed_in",
      properties: {
        userId: user.id,
        method: "oauth",
        provider,
      },
    });

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackServerSignIn", error);
  }
}

/**
 * `startedAt` is the click, not the send: the find route sends this from
 * `after()`, once the search has already finished, and without it the event
 * would land after the `job_found` events it started.
 */
export async function trackJobSearchStarted(
  userId: string,
  jobTitle: string,
  location: string,
  startedAt: Date,
): Promise<void> {
  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    posthog.capture({
      distinctId: userId,
      event: "job_search_started",
      properties: { userId, jobTitle, location },
      timestamp: startedAt,
    });

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackJobSearchStarted", error);
  }
}

/**
 * One `job_found` per saved job — the dashboard's Match Score Distribution
 * buckets them individually. One client and one shutdown for the batch.
 */
export async function trackJobsFound(
  userId: string,
  matchScores: number[],
): Promise<void> {
  if (matchScores.length === 0) return;

  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    for (const matchScore of matchScores) {
      posthog.capture({
        distinctId: userId,
        event: "job_found",
        properties: { userId, source: "search", matchScore },
      });
    }

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackJobsFound", error);
  }
}

/** Powers the dashboard's Company Research Activity chart — feature 14. */
export async function trackCompanyResearched(
  userId: string,
  jobId: string,
  company: string,
): Promise<void> {
  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    posthog.capture({
      distinctId: userId,
      event: "company_researched",
      properties: { userId, jobId, company },
    });

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackCompanyResearched", error);
  }
}

export async function trackProfileCompleted(userId: string): Promise<void> {
  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    posthog.capture({
      distinctId: userId,
      event: "profile_completed",
      properties: { userId },
    });

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackProfileCompleted", error);
  }
}
