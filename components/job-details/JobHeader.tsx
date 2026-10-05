import { Building2, ExternalLink } from "lucide-react";

type Props = {
  title: string;
  company: string;
  matchScore: number;
  viewUrl: string | null;
};

export function JobHeader({ title, company, matchScore, viewUrl }: Props) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-secondary"
        >
          <Building2 className="size-6 text-text-secondary" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl/8 font-bold text-text-primary">{title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
            <span>{company}</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-text-muted" />
            <span className="rounded-full bg-success-lightest px-2.5 py-0.5 text-[13px]/4 font-medium text-success-dark">
              {matchScore}% Match Score
            </span>
          </p>
        </div>
      </div>
      {viewUrl ? (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-sm"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          View Job Post
        </a>
      ) : null}
    </section>
  );
}
