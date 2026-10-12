import type { DashboardStat, StatTrendTone } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type JobStatsRow = {
  found_at: string;
  match_score: number | null;
};

const average = (scores: number[]): number | null =>
  scores.length === 0
    ? null
    : scores.reduce((sum, score) => sum + score, 0) / scores.length;

const scoresOf = (rows: JobStatsRow[]): number[] =>
  rows.flatMap((row) => (row.match_score === null ? [] : [row.match_score]));

function trendOf(change: number): { trend: string; trendTone: StatTrendTone } {
  if (change > 0) return { trend: `+${change}%`, trendTone: "up" };
  if (change < 0) return { trend: `${change}%`, trendTone: "down" };
  return { trend: "0%", trendTone: "flat" };
}

/**
 * The four stat cards from the user's jobs and their researched count.
 *
 * "This week" is the last seven days, not a calendar week. Both trends compare
 * against the jobs found *before* that window, so a user's first week has no
 * baseline and shows no trend rather than an invented one.
 *
 * - Total Jobs Found: how much the total grew over the week, in percent.
 * - Avg. Match Rate: the change in the displayed average, in points. Comparing
 *   the rounded numbers keeps "82%" and "+3%" consistent with each other.
 */
export function buildDashboardStats(
  rows: JobStatsRow[],
  researched: number,
  now: Date = new Date(),
): DashboardStat[] {
  const weekStart = now.getTime() - 7 * DAY_MS;
  const thisWeek = rows.filter((row) => new Date(row.found_at).getTime() >= weekStart);
  const before = rows.filter((row) => new Date(row.found_at).getTime() < weekStart);

  const averageNow = average(scoresOf(rows));
  const averageBefore = average(scoresOf(before));

  const totalTrend =
    before.length > 0
      ? trendOf(Math.round((thisWeek.length / before.length) * 100))
      : {};
  const averageTrend =
    averageNow !== null && averageBefore !== null
      ? trendOf(Math.round(averageNow) - Math.round(averageBefore))
      : {};

  return [
    {
      label: "Total Jobs Found",
      value: String(rows.length),
      caption: "vs last week",
      ...totalTrend,
    },
    {
      label: "Avg. Match Rate",
      value: averageNow === null ? "—" : `${Math.round(averageNow)}%`,
      caption: "vs last week",
      ...averageTrend,
    },
    { label: "Companies Researched", value: String(researched), caption: "Total researched" },
    { label: "Jobs This Week", value: String(thisWeek.length), caption: "New this week" },
  ];
}
