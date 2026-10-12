import { describe, expect, it } from "vitest";

import { buildDashboardStats, type JobStatsRow } from "@/lib/dashboard-stats";

const NOW = new Date("2026-10-13T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const stat = (rows: JobStatsRow[], researched: number, label: string) =>
  buildDashboardStats(rows, researched, NOW).find((card) => card.label === label);

describe("buildDashboardStats", () => {
  it("shows dashes and no trends for a user with no jobs", () => {
    const cards = buildDashboardStats([], 0, NOW);

    expect(cards.map((card) => card.value)).toEqual(["0", "—", "0", "0"]);
    expect(cards.every((card) => card.trend === undefined)).toBe(true);
  });

  it("has no trend in the first week because there is no baseline", () => {
    const rows = [{ found_at: daysAgo(1), match_score: 80 }];

    expect(stat(rows, 0, "Total Jobs Found")?.trend).toBeUndefined();
    expect(stat(rows, 0, "Jobs This Week")?.value).toBe("1");
  });

  it("measures weekly growth against the jobs found before the window", () => {
    const rows = [
      { found_at: daysAgo(20), match_score: 70 },
      { found_at: daysAgo(15), match_score: 70 },
      { found_at: daysAgo(1), match_score: 80 },
    ];

    expect(stat(rows, 0, "Total Jobs Found")).toMatchObject({
      value: "3",
      trend: "+50%",
      trendTone: "up",
    });
  });

  it("compares the rounded average so the number and its trend agree", () => {
    const rows = [
      { found_at: daysAgo(20), match_score: 80 },
      { found_at: daysAgo(1), match_score: 60 },
    ];

    expect(stat(rows, 0, "Avg. Match Rate")).toMatchObject({
      value: "70%",
      trend: "-10%",
      trendTone: "down",
    });
  });

  it("ignores jobs that have no score when averaging", () => {
    const rows = [
      { found_at: daysAgo(2), match_score: 90 },
      { found_at: daysAgo(2), match_score: null },
    ];

    expect(stat(rows, 0, "Avg. Match Rate")?.value).toBe("90%");
  });

  it("passes the researched count through", () => {
    expect(stat([], 4, "Companies Researched")?.value).toBe("4");
  });
});
