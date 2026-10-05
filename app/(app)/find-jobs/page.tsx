import { redirect } from "next/navigation";

import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { buildJobsHref, hasActiveFilters, parseJobFilters } from "@/lib/job-filters";
import { getJobs } from "@/lib/jobs";
import { JOBS_PAGE_SIZE } from "@/lib/utils";

export default async function FindJobsPage(props: PageProps<"/find-jobs">) {
  const filters = parseJobFilters(await props.searchParams);
  const result = await getJobs(filters);

  if (result.status === "unauthenticated") redirect("/login");
  // A read failure goes to the segment's error boundary rather than rendering
  // an empty table that claims the user has no jobs.
  if (result.status === "error") {
    throw new Error("Could not load jobs");
  }

  const { jobs, total } = result;
  const pageCount = Math.max(1, Math.ceil(total / JOBS_PAGE_SIZE));

  // A bookmarked page that no longer exists — jobs were filtered or deleted
  // since — lands on the last real one instead of an empty table.
  if (filters.page > pageCount) {
    redirect(buildJobsHref({ ...filters, page: pageCount }));
  }

  const from = (filters.page - 1) * JOBS_PAGE_SIZE + 1;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-8 xl:px-13">
      <SearchControls />
      <JobFilters filters={filters} />
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <JobsTable jobs={jobs} isFiltered={hasActiveFilters(filters)} />
        <JobsPagination
          filters={filters}
          pageCount={pageCount}
          from={jobs.length > 0 ? from : 0}
          to={jobs.length > 0 ? from + jobs.length - 1 : 0}
          total={total}
        />
      </section>
    </div>
  );
}
