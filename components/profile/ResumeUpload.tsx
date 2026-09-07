"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { CloudUpload, FileText, Loader2 } from "lucide-react";

import { uploadResume, type ProfileActionState } from "@/actions/profile";
import {
  MAX_RESUME_BYTES,
  RESUME_MIME_TYPE,
  RESUME_SIZE_ERROR,
  RESUME_TYPE_ERROR,
} from "@/lib/utils";

// A "use server" module can only export async functions, so the initial state
// for useActionState is declared on the client side of the boundary.
const INITIAL_STATE: ProfileActionState = { status: "idle", message: "" };

type Props = {
  resumeKey: string | null;
};

export function ResumeUpload({ resumeKey }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState("");
  const [state, formAction, isPending] = useActionState(
    uploadResume,
    INITIAL_STATE,
  );

  // Checked here as well as in the action because Next rejects a Server Action
  // body over `serverActions.bodySizeLimit` before the action can run — an
  // oversized file would surface as a framework error rather than this message.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error =
      file.type !== RESUME_MIME_TYPE
        ? RESUME_TYPE_ERROR
        : file.size > MAX_RESUME_BYTES
          ? RESUME_SIZE_ERROR
          : "";

    setClientError(error);

    if (error) {
      event.target.value = "";
      return;
    }

    formRef.current?.requestSubmit();
  };

  const isError = clientError !== "" || state.status === "error";
  const status =
    clientError ||
    (state.status !== "idle"
      ? state.message
      : resumeKey
        ? "A resume is on file. Uploading a new one replaces it."
        : "");

  return (
    <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h2 className="text-xl/6 font-semibold text-text-primary">Resume</h2>
      <p className="mt-1.5 text-sm text-text-secondary">
        Upload an existing resume to auto-fill the profile, or generate a new
        tailored one from your details below.
      </p>

      <form ref={formRef} action={formAction}>
        <label className="mt-6 flex h-[252px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-secondary px-6 text-center">
          <input
            type="file"
            name="resume"
            accept={RESUME_MIME_TYPE}
            disabled={isPending}
            onChange={handleChange}
            className="sr-only"
          />
          <span className="flex size-13 items-center justify-center rounded-full bg-surface shadow-sm">
            {isPending ? (
              <Loader2 className="size-7 animate-spin text-accent" />
            ) : (
              <CloudUpload className="size-7 text-accent" />
            )}
          </span>
          <span className="mt-4 text-base font-semibold text-text-primary">
            {isPending
              ? "Uploading your resume…"
              : "Click to upload or drag and drop"}
          </span>
          <span className="mt-1 text-sm text-text-secondary">
            PDF formatting only. Maximum file size 5MB.
          </span>
          <span className="mt-6 flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm">
            Select Resume
          </span>
        </label>
      </form>

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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <p className="text-sm text-text-secondary">
          Need a fresh document based on the fields below?
        </p>
        <button
          type="button"
          className="flex h-10 shrink-0 items-center gap-2.5 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground"
        >
          <FileText className="size-4" />
          Generate Resume from Profile
        </button>
      </div>
    </section>
  );
}
