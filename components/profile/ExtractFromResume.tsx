"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  requestResumeExtraction,
  type ExtractedProfile,
} from "@/lib/resume-extraction";

const NOTHING_FOUND =
  "We read your resume but found nothing to add to the fields below.";

const filledMessage = (count: number): string =>
  `Filled in ${count} ${count === 1 ? "field" : "fields"} from your resume. Review them, then press Save Profile.`;

type Props = {
  /** Applies the extraction and answers how many fields it changed. */
  onExtracted: (extracted: ExtractedProfile) => number;
};

export function ExtractFromResume({ onExtracted }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const extract = async () => {
    setIsPending(true);
    setStatus("");

    const result = await requestResumeExtraction();

    if (result.status === "error") {
      setIsError(true);
      setStatus(result.message);
      setIsPending(false);
      return;
    }

    // The merge is allowed to change nothing — a resume that repeats what is
    // already on file, or one the model read little from. Saying so is the only
    // thing separating that from a button that did not work.
    const changed = onExtracted(result.data);
    setIsError(false);
    setStatus(changed > 0 ? filledMessage(changed) : NOTHING_FOUND);
    setIsPending(false);
  };

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-text-secondary">
          Read your details straight out of the PDF above. This replaces the
          fields below — nothing is saved until you press Save Profile.
        </p>
        <button
          type="button"
          onClick={extract}
          disabled={isPending}
          className="flex h-10 shrink-0 items-center gap-2.5 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-text-primary shadow-sm disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin text-accent" />
          ) : (
            <Sparkles className="size-4 text-accent" />
          )}
          {isPending ? "Reading your resume…" : "Extract from Resume"}
        </button>
      </div>

      {status && (
        <p
          role={isError ? "alert" : "status"}
          className={`mt-4 text-sm ${
            isError ? "text-error-strong" : "text-text-dark"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
