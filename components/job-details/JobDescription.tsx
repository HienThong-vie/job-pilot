import { FileText } from "lucide-react";

import { IconTile } from "@/components/job-details/IconTile";

type Props = {
  description: string | null;
};

export function JobDescription({ description }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <IconTile tone="gray">
          <FileText />
        </IconTile>
        <h2 className="text-base/6 font-semibold text-text-primary">
          Job Description
        </h2>
      </div>
      {description ? (
        <p className="mt-5 text-[15px]/[23px] text-text-primary">
          {description}
        </p>
      ) : (
        <p className="mt-5 text-sm text-text-muted">
          This listing has no description.
        </p>
      )}
    </section>
  );
}
