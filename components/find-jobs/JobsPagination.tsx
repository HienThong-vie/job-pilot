import Link from "next/link";

import { buildJobsHref, type JobFilters } from "@/lib/job-filters";

type Props = {
  filters: JobFilters;
  pageCount: number;
  from: number;
  to: number;
  total: number;
};

type PageItem = number | "ellipsis";

const BUTTON =
  "flex h-8 items-center justify-center rounded-md border text-sm font-medium shadow-sm";

// Colour lives in two exclusive sets: both setting `bg-*` / `text-*` on the same
// element would leave the winner to stylesheet order, not to the active state.
const IDLE = "border-border bg-surface text-text-primary";
const ACTIVE = "border-accent-light bg-accent-muted text-accent";

const COUNT = "font-semibold text-text-primary";

// First and last page always show, plus the current page and its neighbours.
// Near the start the design shows three pages, so the third is added there.
function getPageItems(page: number, pageCount: number): PageItem[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 2) wanted.add(3);

  const pages = [...wanted]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  return pages.flatMap((value, index): PageItem[] =>
    index > 0 && value - pages[index - 1] > 1 ? ["ellipsis", value] : [value],
  );
}

export function JobsPagination({ filters, pageCount, from, to, total }: Props) {
  const page = filters.page;
  const hrefFor = (target: number) => buildJobsHref({ ...filters, page: target });

  return (
    <nav
      aria-label="Pagination"
      className="flex min-h-[66px] flex-wrap items-center justify-between gap-4 bg-surface-secondary px-6 py-4"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-text-secondary">
          Showing <strong className={COUNT}>{from}</strong> to{" "}
          <strong className={COUNT}>{to}</strong> of{" "}
          <strong className={COUNT}>{total}</strong> results
        </p>
        {/* Adzuna's terms ask for attribution wherever its listings appear. */}
        <a
          href="https://www.adzuna.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-muted hover:text-text-secondary"
        >
          Jobs by Adzuna
        </a>
      </div>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={`${BUTTON} ${IDLE} px-3`}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={`${BUTTON} ${IDLE} px-3 text-text-muted`}>
            Previous
          </span>
        )}
        {getPageItems(page, pageCount).map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="w-8 text-center text-sm text-text-muted"
            >
              ...
            </span>
          ) : (
            <Link
              key={item}
              href={hrefFor(item)}
              aria-current={item === page ? "page" : undefined}
              className={`${BUTTON} min-w-8 px-2 ${item === page ? ACTIVE : IDLE}`}
            >
              {item}
            </Link>
          ),
        )}
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} className={`${BUTTON} ${IDLE} px-3`}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={`${BUTTON} ${IDLE} px-3 text-text-muted`}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
