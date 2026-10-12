import { StatCard } from "@/components/dashboard/StatCard";
import type { DashboardStat } from "@/types";

type Props = {
  stats: DashboardStat[];
};

export function StatsBar({ stats }: Props) {
  return (
    <section
      aria-label="Overview"
      className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </section>
  );
}
