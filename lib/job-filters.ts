import { z } from "zod";

import { MAX_FIELD_LENGTH } from "@/lib/utils";

export const MATCH_FILTERS = ["all", "high", "low"] as const;
export const SORT_ORDERS = ["score", "newest", "oldest"] as const;

export type MatchFilter = (typeof MATCH_FILTERS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export type JobFilters = {
  query: string;
  match: MatchFilter;
  sort: SortOrder;
  page: number;
};

export const DEFAULT_MATCH: MatchFilter = "all";
export const DEFAULT_SORT: SortOrder = "score";

// A page number past this is a typo or a probe, and a huge one becomes a huge
// database offset.
const MAX_PAGE = 10_000;

// Every field falls back to its default rather than failing: the URL is typed
// by hand and bookmarked, and a stale or mangled param should show the default
// list, not an error page.
const filtersSchema = z.object({
  q: z.string().trim().max(MAX_FIELD_LENGTH).catch(""),
  match: z.enum(MATCH_FILTERS).catch(DEFAULT_MATCH),
  sort: z.enum(SORT_ORDERS).catch(DEFAULT_SORT),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
});

type RawSearchParams = Record<string, string | string[] | undefined>;

// `?q=a&q=b` arrives as an array; the first value wins.
const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function parseJobFilters(raw: RawSearchParams): JobFilters {
  const parsed = filtersSchema.parse({
    q: first(raw.q),
    match: first(raw.match),
    sort: first(raw.sort),
    page: first(raw.page),
  });

  return {
    query: parsed.q,
    match: parsed.match,
    sort: parsed.sort,
    page: parsed.page,
  };
}

/**
 * The Find Jobs URL for a set of filters. Defaults are left out so the plain
 * page keeps a clean address.
 */
export function buildJobsHref(filters: JobFilters): string {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.match !== DEFAULT_MATCH) params.set("match", filters.match);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const search = params.toString();
  return search ? `/find-jobs?${search}` : "/find-jobs";
}

export function hasActiveFilters(filters: JobFilters): boolean {
  return filters.query !== "" || filters.match !== DEFAULT_MATCH;
}
