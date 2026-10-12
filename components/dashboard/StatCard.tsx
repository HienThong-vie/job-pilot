import type { DashboardStat, StatTrendTone } from "@/types";

type Props = {
  stat: DashboardStat;
};

// One exclusive colour set per tone — never two background or text utilities on one element.
const TREND_TONES: Record<StatTrendTone, string> = {
  up: "bg-success-lightest text-success-darker",
  down: "bg-error-lightest text-error-strong",
  flat: "bg-surface-secondary text-text-secondary",
};

export function StatCard({ stat }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm/5 font-medium text-text-secondary">{stat.label}</p>
      <p className="mt-1 text-3xl/9 font-semibold text-text-primary">{stat.value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs/4">
        {stat.trend && (
          <span
            className={`rounded-sm px-2 py-0.5 font-medium ${TREND_TONES[stat.trendTone ?? "up"]}`}
          >
            {stat.trend}
          </span>
        )}
        <span className="text-text-muted">{stat.caption}</span>
      </div>
    </div>
  );
}
