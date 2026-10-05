"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { FilterSelect } from "@/components/find-jobs/FilterSelect";
import {
  buildJobsHref,
  type JobFilters as Filters,
  type MatchFilter,
  type SortOrder,
} from "@/lib/job-filters";
import { MAX_FIELD_LENGTH } from "@/lib/utils";

type Props = {
  filters: Filters;
};

const MATCH_OPTIONS: { value: MatchFilter; label: string }[] = [
  { value: "all", label: "All Matches" },
  { value: "high", label: "High Match" },
  { value: "low", label: "Low Match" },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "score", label: "Match Score" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

// Long enough to let a word finish typing, short enough to feel live.
const SEARCH_DEBOUNCE_MS = 300;

export function JobFilters({ filters }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // The selects show the choice at once and settle on whatever the URL says when
  // the navigation finishes.
  const [match, setMatch] = useOptimistic(filters.match);
  const [sort, setSort] = useOptimistic(filters.sort);

  const [text, setText] = useState(filters.query);
  // `pushed` is the last text this component wrote to the URL and `seen` the
  // last URL value it noticed. The URL lagging behind the typing is expected —
  // only a URL value we did not write (the back button) overwrites the input.
  const [pushed, setPushed] = useState(filters.query);
  const [seen, setSeen] = useState(filters.query);
  if (filters.query !== seen) {
    setSeen(filters.query);
    if (filters.query !== pushed) {
      setText(filters.query);
      setPushed(filters.query);
    }
  }

  // The debounced write must see the match and sort chosen while it waited, and
  // the URL has not caught up with those yet — so `navigate` records each change
  // here itself, and the effect only takes over for changes made elsewhere.
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Changing what is being looked at always goes back to the first page.
  const navigate = (next: Partial<Filters>) => {
    latest.current = { ...latest.current, ...next, page: 1 };
    router.replace(buildJobsHref(latest.current), { scroll: false });
  };

  const changeText = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = value.trim();
      setPushed(query);
      startTransition(() => navigate({ query }));
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <section className="flex min-h-[53px] flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface py-2 pr-4 pl-5 shadow-sm">
      <div className="flex min-w-48 flex-1 items-center gap-3 rounded-md focus-within:ring-1 focus-within:ring-accent">
        <Search aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
        <input
          type="text"
          value={text}
          onChange={(event) => changeText(event.target.value)}
          maxLength={MAX_FIELD_LENGTH}
          aria-label="Filter by company or role"
          placeholder="Filter by company or role..."
          className="h-[34px] w-full bg-transparent text-sm text-text-darkest placeholder:text-text-darkest/50 focus:outline-none"
        />
      </div>
      <span aria-hidden="true" className="hidden h-[34px] w-px bg-border sm:block" />
      <div className="flex items-center gap-2">
        <FilterSelect
          label="Filter by match"
          value={match}
          options={MATCH_OPTIONS}
          onChange={(value) =>
            startTransition(() => {
              setMatch(value);
              navigate({ match: value });
            })
          }
        />
        <FilterSelect
          label="Sort jobs"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) =>
            startTransition(() => {
              setSort(value);
              navigate({ sort: value });
            })
          }
        />
      </div>
    </section>
  );
}
