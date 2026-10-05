import { Building2 } from "lucide-react";
import Link from "next/link";

import { MatchScoreBar } from "@/components/find-jobs/MatchScoreBar";
import type { JobListRow } from "@/types";

type Props = {
  jobs: JobListRow[];
  isFiltered: boolean;
};

const HEAD =
  "h-12 border-b border-border bg-surface-secondary text-xs font-semibold tracking-wider text-text-label uppercase";

const CELL = "h-[65px] border-b border-border";

export function JobsTable({ jobs, isFiltered }: Props) {
  if (jobs.length === 0) {
    return (
      <p className="px-6 py-16 text-center text-sm text-text-muted">
        {isFiltered
          ? "No jobs match these filters. Try a different search or match level."
          : "No jobs yet. Search above and your matches will appear here."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] table-fixed text-left">
        <colgroup>
          <col className="w-[24.2%]" />
          <col className="w-[19%]" />
          <col className="w-[25.9%]" />
          <col className="w-[17.5%]" />
          <col className="w-[13.4%]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={`${HEAD} pl-11`}>
              Company
            </th>
            <th scope="col" className={HEAD}>
              Role
            </th>
            <th scope="col" className={`${HEAD} text-center`}>
              Match Score
            </th>
            <th scope="col" className={HEAD}>
              Salary Est.
            </th>
            <th scope="col" className={HEAD}>
              Date Found
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="relative hover:bg-surface-secondary">
              <td className={`${CELL} pl-11`}>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-secondary">
                    <Building2
                      aria-hidden="true"
                      className="size-4 text-text-secondary"
                    />
                  </span>
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {job.company}
                  </span>
                </div>
              </td>
              <td className={`${CELL} truncate pr-4 text-sm font-medium text-text-dark`}>
                <Link
                  href={`/find-jobs/${job.id}`}
                  className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  {job.title}
                </Link>
              </td>
              <td className={CELL}>
                <div className="flex justify-center">
                  <MatchScoreBar score={job.match_score} />
                </div>
              </td>
              <td className={`${CELL} text-sm text-text-dark`}>
                {job.salary ?? "Not listed"}
              </td>
              <td className={`${CELL} text-sm text-text-secondary`}>
                {job.found_at_label}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
