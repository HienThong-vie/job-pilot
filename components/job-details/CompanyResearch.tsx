import { Building2, Search } from "lucide-react";

import { IconTile } from "@/components/job-details/IconTile";

type Props = {
  company: string;
};

export function CompanyResearch({ company }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <IconTile tone="purple">
            <Building2 />
          </IconTile>
          <h2 className="text-base/6 font-semibold text-text-primary">
            Company Research
          </h2>
        </div>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          <Search aria-hidden="true" className="size-4" />
          Research Company
        </button>
      </div>
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-xl bg-surface-secondary"
        >
          <Building2 className="size-6 text-text-muted" />
        </span>
        <p className="mt-2.5 text-[15px]/6 font-medium text-text-primary">
          No research yet
        </p>
        <p className="mt-0.5 max-w-[320px] text-sm/5 text-text-muted">
          Click “Research Company” to let the AI browse {company}&apos;s public
          pages and build a dossier.
        </p>
      </div>
    </section>
  );
}
