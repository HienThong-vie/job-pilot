import type { ReactNode } from "react";

import { CHART_HEIGHT_CLASS } from "@/lib/chart-theme";

type Props = {
  title: string;
  children: ReactNode;
};

export function ChartCard({ title, children }: Props) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-base/6 font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 flex flex-1 flex-col justify-end">
        <div className={`${CHART_HEIGHT_CLASS} min-w-0`}>{children}</div>
      </div>
    </section>
  );
}
