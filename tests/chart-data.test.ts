import { describe, expect, it } from "vitest";

import {
  buildDashboardCharts,
  hasChartData,
  JOBS_FOUND_DAYS,
  RESEARCH_DAYS,
  SCORE_BUCKET_LABELS,
} from "@/lib/chart-data";

const NOW = new Date("2026-10-13T12:00:00Z");

describe("buildDashboardCharts", () => {
  it("returns zero-filled series of the expected length when there are no rows", () => {
    const charts = buildDashboardCharts([], NOW);

    expect(charts.jobsFound).toHaveLength(JOBS_FOUND_DAYS);
    expect(charts.research).toHaveLength(RESEARCH_DAYS);
    expect(charts.scores.map((point) => point.label)).toEqual([...SCORE_BUCKET_LABELS]);
    expect(hasChartData(charts.jobsFound)).toBe(false);
    expect(hasChartData(charts.research)).toBe(false);
    expect(hasChartData(charts.scores)).toBe(false);
  });

  it("places daily counts on their UTC day, oldest first, ending today", () => {
    const charts = buildDashboardCharts(
      [
        ["job_found", "2026-10-04", 40],
        ["job_found", "2026-10-13", 3],
      ],
      NOW,
    );

    const last = charts.jobsFound[charts.jobsFound.length - 1];
    expect(last).toEqual({ label: "Oct 13", value: 3 });
    expect(charts.jobsFound.find((point) => point.label === "Oct 4")?.value).toBe(40);
    expect(charts.jobsFound[0].label).toBe("Sep 14");
  });

  it("labels the research chart by weekday for the last seven days", () => {
    const charts = buildDashboardCharts([["company_researched", "2026-10-13", 1]], NOW);

    expect(charts.research.map((point) => point.label)).toEqual([
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
      "Mon",
      "Tue",
    ]);
    expect(charts.research[6].value).toBe(1);
  });

  it("ignores events outside the window", () => {
    const charts = buildDashboardCharts([["job_found", "2026-01-01", 99]], NOW);

    expect(hasChartData(charts.jobsFound)).toBe(false);
  });

  it("groups scores by decile, with everything under 50 in the first bar", () => {
    const charts = buildDashboardCharts(
      [
        ["score", "2", 4],
        ["score", "4", 1],
        ["score", "5", 5],
        ["score", "7", 2],
        ["score", "9", 8],
        ["score", "10", 12],
      ],
      NOW,
    );

    expect(charts.scores.map((point) => point.value)).toEqual([5, 5, 0, 2, 0, 20]);
  });

  it("drops malformed rows instead of failing the chart", () => {
    const charts = buildDashboardCharts(
      [
        ["job_found", "2026-10-13", "not a number"],
        ["job_found", "2026-10-13", -4],
        [42, "2026-10-13", 1],
        ["job_found", "2026-10-13", 2],
      ],
      NOW,
    );

    expect(charts.jobsFound[charts.jobsFound.length - 1].value).toBe(2);
  });
});
