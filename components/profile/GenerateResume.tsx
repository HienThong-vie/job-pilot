"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { requestResumeGeneration } from "@/lib/resume-generation";

const SUCCESS =
  "Your resume is ready. Open it below to check it before you send it anywhere.";

type Props = {
  /** Null when nothing is on file yet — see the confirm step below. */
  resumeKey: string | null;
};

/**
 * Generates a resume PDF from the saved profile, replacing whatever is on file.
 *
 * The confirm step is the whole reason this is a two-state component. The
 * generate route overwrites `resumes/{user_id}/resume.pdf`, which is the same
 * key an uploaded resume occupies — so for a user who uploaded their own PDF,
 * one click would destroy it with no way back. The confirm is skipped when
 * `resumeKey` is null, because then there is nothing to replace and asking
 * would be noise.
 */
export function GenerateResume({ resumeKey }: Props) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const generate = async () => {
    setIsConfirming(false);
    setIsPending(true);
    setStatus("");

    const result = await requestResumeGeneration();

    if (result.status === "error") {
      setIsError(true);
      setStatus(result.message);
      setIsPending(false);
      return;
    }

    setIsError(false);
    setStatus(SUCCESS);
    setIsPending(false);

    // The route revalidates /profile, but this page is already rendered. A
    // refresh is what makes the resume row and the Extract button appear when
    // this generation is the one that first set `resume_pdf_url`.
    router.refresh();
  };

  const start = () => {
    if (resumeKey) {
      setIsConfirming(true);
      return;
    }
    void generate();
  };

  return (
    <div className="mt-6 border-t border-border pt-4">
      {isConfirming ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-text-primary">
            This replaces the resume above with a new one built from your saved
            profile. The current file cannot be recovered.
          </p>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={generate}
              className="flex h-10 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground"
            >
              Replace resume
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-text-secondary">
            Build a clean one-page PDF from your saved profile.
            {resumeKey
              ? " This replaces the resume above."
              : " Save your changes first — it reads the saved version."}
          </p>
          <button
            type="button"
            onClick={start}
            disabled={isPending}
            className="flex h-10 shrink-0 items-center gap-2.5 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {isPending ? "Writing your resume…" : "Generate Resume from Profile"}
          </button>
        </div>
      )}

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
