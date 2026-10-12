import { z } from "zod";

import { buildDashboardCharts, JOBS_FOUND_DAYS, type DashboardCharts } from "@/lib/chart-data";
import { createInsforgeServer } from "@/lib/insforge-server";
import { runHogQL } from "@/lib/posthog-query";

export type DashboardChartsResult =
  | { status: "ok"; charts: DashboardCharts }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

// PostHog's Query API allows three queries at once for the whole project, so
// the three charts share one query instead of taking one each. Both legs are
// bounded on timestamp, which the events table needs to stay cheap.
//
// - Daily counts for the jobs chart (30 days); the research chart is the last
//   seven of the same rows.
// - Match scores grouped by tens over the past year, standing in for "all time".
//
// Filtered on `distinct_id`, not `person_id`: persons merge, and the server
// sends these events under the user's id.
const DASHBOARD_CHARTS_QUERY = `
SELECT
  event AS kind,
  toString(toDate(timestamp)) AS bucket,
  count() AS n
FROM events
WHERE distinct_id = {userId}
  AND event IN ('job_found', 'company_researched')
  AND timestamp >= toStartOfDay(now()) - INTERVAL ${JOBS_FOUND_DAYS - 1} DAY
GROUP BY kind, bucket
UNION ALL
SELECT
  'score' AS kind,
  toString(toInt(floor(toFloat(properties.matchScore) / 10))) AS bucket,
  count() AS n
FROM events
WHERE distinct_id = {userId}
  AND event = 'job_found'
  AND properties.matchScore IS NOT NULL
  AND timestamp >= now() - INTERVAL 365 DAY
GROUP BY kind, bucket
`;

const userIdSchema = z.string().uuid();

/**
 * The dashboard's three charts for the signed-in user, from PostHog.
 *
 * PostHog being down, or the personal key being absent, is `unavailable`, not
 * an error: the stat cards come from the database and should not go blank
 * because analytics did.
 *
 * These are counts of what happened, so a job found and later deleted still
 * counts here and not in the "Total Jobs Found" card. That is the difference
 * between a history and the current state.
 */
export async function getDashboardCharts(): Promise<DashboardChartsResult> {
  const insforge = await createInsforgeServer();
  const { data: session } = await insforge.auth.getCurrentUser();
  if (!session.user) return { status: "unauthenticated" };

  // Bound by placeholder, and checked too: this id is the only thing keeping
  // one user's events out of another's charts.
  const userId = userIdSchema.safeParse(session.user.id);
  if (!userId.success) {
    console.error("[lib/dashboard-charts] session user id is not a uuid");
    return { status: "unavailable" };
  }

  const result = await runHogQL("dashboard-charts", DASHBOARD_CHARTS_QUERY, {
    userId: userId.data,
  });
  if (result.status !== "ok") return { status: "unavailable" };

  return { status: "ok", charts: buildDashboardCharts(result.results) };
}
