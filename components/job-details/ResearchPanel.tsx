"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, CircleAlert, Loader2, RefreshCw, Search } from "lucide-react";

import { IconTile } from "@/components/job-details/IconTile";
import { requestCompanyResearch } from "@/lib/company-research";

type Props = {
  jobId: string;
  company: string;
  hasDossier: boolean;
  /** The server-rendered body: the dossier, or the empty state. */
  children: ReactNode;
};

const BUTTON = "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-60";

// A first run is the card's call to action; a re-run is a quieter second
// choice next to a dossier that is already useful.
const PRIMARY = "bg-accent text-accent-foreground";
const SECONDARY = "border border-border bg-surface text-text-primary shadow-sm";

export function ResearchPanel({ jobId, company, hasDossier, children }: Props) {
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);
  // The refresh runs in a transition so the pending state lasts until the
  // dossier has rendered — otherwise the empty state flashes in between.
  const [isRefreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPending = isRequesting || isRefreshing;

  const research = async () => {
    setIsRequesting(true);
    setError(null);

    const result = await requestCompanyResearch(jobId);

    if (result.status === "error") {
      setError(result.message);
    } else {
      // Re-renders the server page so the card picks up the saved dossier.
      startRefresh(() => router.refresh());
    }
    setIsRequesting(false);
  };

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
          onClick={research}
          disabled={isPending}
          className={`${BUTTON} ${hasDossier ? SECONDARY : PRIMARY}`}
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : hasDossier ? (
            <RefreshCw aria-hidden="true" className="size-4" />
          ) : (
            <Search aria-hidden="true" className="size-4" />
          )}
          {isPending
            ? "Researching…"
            : hasDossier
              ? "Research Again"
              : "Research Company"}
        </button>
      </div>

      {isPending && (
        <p
          role="status"
          className="border-b border-border bg-surface-secondary px-6 py-3 text-sm text-text-secondary"
        >
          Browsing {company}&apos;s website and writing your briefing. This
          usually takes one to two minutes.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 border-b border-error-light bg-error-lightest px-6 py-3 text-sm font-medium text-error-strong"
        >
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}

      {children}
    </section>
  );
}
