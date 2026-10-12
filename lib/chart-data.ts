import type { ChartPoint } from "@/types";

export type DashboardCharts = {
  research: ChartPoint[];
  jobsFound: ChartPoint[];
  scores: ChartPoint[];
};

export const JOBS_FOUND_DAYS = 30;
export const RESEARCH_DAYS = 7;

// Lower-inclusive: 50 is in "50-60%", 100 is in "90-100%". Scores under 50 get
// their own bar, because the matcher does produce them (35% of the first real
// data set) and a chart that quietly dropped them would not add up.
export const SCORE_BUCKET_LABELS = [
  "<50%",
  "50-60%",
  "60-70%",
  "70-80%",
  "80-90%",
  "90-100%",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

type CountRow = { kind: string; bucket: string; count: number };

/** Rows are `[kind, bucket, count]`. A row that is not drops out, not the chart. */
function toCountRows(rows: unknown[][]): CountRow[] {
  return rows.flatMap((row) => {
    const [kind, bucket, count] = row;
    const n = Number(count);
    if (typeof kind !== "string" || typeof bucket !== "string") return [];
    if (!Number.isFinite(n) || n < 0) return [];
    return [{ kind, bucket, count: n }];
  });
}

/**
 * One point per UTC day, oldest first, ending today. A day with no events is 0,
 * not missing, so the line shows the gap instead of joining across it.
 */
function dailySeries(
  rows: CountRow[],
  kind: string,
  days: number,
  now: Date,
  format: Intl.DateTimeFormat,
): ChartPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.kind === kind) {
      counts.set(row.bucket, (counts.get(row.bucket) ?? 0) + row.count);
    }
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getTime() - (days - 1 - index) * DAY_MS);
    return {
      label: format.format(date),
      value: counts.get(dayKey(date)) ?? 0,
    };
  });
}

/**
 * Rows are scores grouped by tens: bucket "7" is 70-79. Everything under 50
 * lands in the first bar and 100 (bucket "10") joins 90-100%.
 */
function scoreSeries(rows: CountRow[]): ChartPoint[] {
  const totals = SCORE_BUCKET_LABELS.map(() => 0);

  for (const row of rows) {
    if (row.kind !== "score") continue;
    const decile = Number(row.bucket);
    if (!Number.isInteger(decile) || decile < 0) continue;
    const index = Math.min(Math.max(decile - 4, 0), SCORE_BUCKET_LABELS.length - 1);
    totals[index] += row.count;
  }

  return SCORE_BUCKET_LABELS.map((label, index) => ({
    label,
    value: totals[index],
  }));
}

/**
 * The three dashboard charts from PostHog's grouped counts.
 *
 * The query returns `[kind, bucket, count]` rows: per-day counts of `job_found`
 * and `company_researched` (the bucket is a UTC date), and `score` rows
 * (the bucket is a score decile). Research is the last seven of the same days
 * the jobs chart covers.
 */
export function buildDashboardCharts(
  rawRows: unknown[][],
  now: Date = new Date(),
): DashboardCharts {
  const rows = toCountRows(rawRows);

  return {
    research: dailySeries(rows, "company_researched", RESEARCH_DAYS, now, weekday),
    jobsFound: dailySeries(rows, "job_found", JOBS_FOUND_DAYS, now, monthDay),
    scores: scoreSeries(rows),
  };
}

/** An all-zero chart is an empty chart: say so rather than draw a flat axis. */
export const hasChartData = (points: ChartPoint[]): boolean =>
  points.some((point) => point.value > 0);
