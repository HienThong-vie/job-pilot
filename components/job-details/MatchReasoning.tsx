import { Sparkles } from "lucide-react";

import { IconTile } from "@/components/job-details/IconTile";

type Props = {
  reason: string | null;
};

export function MatchReasoning({ reason }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <IconTile tone="green">
          <Sparkles />
        </IconTile>
        <h2 className="text-xs/4 font-semibold tracking-wider text-text-secondary uppercase">
          AI Match Reasoning
        </h2>
      </div>
      {reason ? (
        <p className="mt-3 text-[15px]/[23px] text-text-primary">{reason}</p>
      ) : (
        <p className="mt-4 text-sm text-text-muted">
          No match reasoning was saved for this job.
        </p>
      )}
    </section>
  );
}
