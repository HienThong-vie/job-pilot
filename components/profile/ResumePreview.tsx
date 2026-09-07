import { ExternalLink, FileText } from "lucide-react";

type Props = {
  fileName: string;
};

/**
 * The state for a resume already in storage. `profile.png` has no design for
 * this, so it is built from the tokens and shapes the rest of the card already
 * uses — a tinted row like the work-experience card, the same 40px controls.
 *
 * The link goes through /api/resume/view rather than holding a signed URL:
 * the bucket is private, and a URL embedded here would expire while the page
 * sat open.
 */
export function ResumePreview({ fileName }: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-secondary p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface shadow-sm">
        <FileText className="size-5 text-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {fileName}
        </p>
        <p className="mt-0.5 text-sm text-text-secondary">
          Uploading a new file replaces it.
        </p>
      </div>
      <a
        href="/api/resume/view"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm"
      >
        <ExternalLink className="size-4" />
        View resume
      </a>
    </div>
  );
}
