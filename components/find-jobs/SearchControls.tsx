"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, Search, Sparkles } from "lucide-react";

import {
  describeSearch,
  jobSearchRequestSchema,
  requestJobSearch,
} from "@/lib/job-search";
import { MAX_FIELD_LENGTH } from "@/lib/utils";

type Banner = { kind: "success" | "error"; message: string };

const INPUT =
  "h-[42px] w-full rounded-md border border-border bg-surface text-sm text-text-darkest shadow-sm placeholder:text-text-darkest/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none";

const LABEL = "block text-xs font-semibold tracking-[0.01em] text-text-label uppercase";

const BANNER = "mt-4 flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium";

// Colour lives in two exclusive sets, like JobsPagination's IDLE / ACTIVE.
const SUCCESS = "border-success-light bg-success-lightest text-success-dark";
const ERROR = "border-error-light bg-error-lightest text-error-strong";

export function SearchControls() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const input = jobSearchRequestSchema.safeParse({
      jobTitle: form.get("jobTitle"),
      location: form.get("location"),
    });

    if (!input.success) {
      setBanner({
        kind: "error",
        message: input.error.issues[0]?.message ?? "Check your search.",
      });
      return;
    }

    setIsPending(true);
    setBanner(null);

    const result = await requestJobSearch(input.data);

    if (result.status === "error") {
      setBanner({ kind: "error", message: result.message });
    } else {
      setBanner({ kind: "success", message: describeSearch(result.summary) });
      // Re-renders the server page so the table picks up the new rows.
      router.refresh();
    }
    setIsPending(false);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <form
        onSubmit={search}
        className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="job-title" className={LABEL}>
            Job title
          </label>
          <div className="relative mt-1.5">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-text-muted"
            />
            <input
              id="job-title"
              name="jobTitle"
              type="text"
              required
              maxLength={MAX_FIELD_LENGTH}
              placeholder="Frontend Engineer"
              className={`${INPUT} pr-4 pl-9`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="location" className={LABEL}>
            Location
          </label>
          <div className="mt-1.5">
            <input
              id="location"
              name="location"
              type="text"
              maxLength={MAX_FIELD_LENGTH}
              placeholder="Remote, New York..."
              className={`${INPUT} px-4`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="size-4" />
          )}
          {isPending ? "Searching…" : "Find Jobs"}
        </button>
      </form>

      {isPending && (
        <p role="status" className="mt-4 text-sm text-text-secondary">
          Searching Adzuna and scoring each job against your profile. This
          usually takes 10 to 20 seconds.
        </p>
      )}

      {banner && (
        <p
          role={banner.kind === "error" ? "alert" : "status"}
          className={`${BANNER} ${banner.kind === "error" ? ERROR : SUCCESS}`}
        >
          {banner.kind === "error" ? (
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <Sparkles aria-hidden="true" className="size-4 shrink-0" />
          )}
          {banner.message}
        </p>
      )}
    </section>
  );
}
