import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[856px] flex-col gap-6 px-4 pt-7 pb-12 sm:px-8">
      <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl/6 font-semibold text-text-primary">
          Job not found
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          This job doesn&apos;t exist or isn&apos;t in your list.
        </p>
        <Link
          href="/find-jobs"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground"
        >
          Back to Jobs
        </Link>
      </section>
    </div>
  );
}
