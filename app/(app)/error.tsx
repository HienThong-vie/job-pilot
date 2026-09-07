"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-9 px-4 py-9 sm:px-8">
      <section className="flex flex-col items-start rounded-2xl border border-error-light bg-error-tint px-8 py-9.5 shadow-sm">
        <h1 className="flex items-center gap-2.5 text-xl/6 font-semibold text-text-primary">
          <CircleAlert className="size-5 shrink-0 text-error-strong" />
          Something went wrong
        </h1>
        <p className="mt-3 max-w-[430px] text-sm/[23px] text-text-dark">
          We could not load this page. Your work has not been lost — try again,
          and if it keeps happening the backend may be unavailable.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 flex h-10 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
