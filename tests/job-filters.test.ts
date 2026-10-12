import { describe, expect, it } from "vitest";

import { buildJobsHref, hasActiveFilters, parseJobFilters } from "@/lib/job-filters";

describe("parseJobFilters", () => {
  it("uses the defaults when the URL has no params", () => {
    expect(parseJobFilters({})).toEqual({ query: "", match: "all", sort: "score", page: 1 });
  });

  it("falls back to defaults for mangled params instead of failing", () => {
    expect(parseJobFilters({ match: "nope", sort: "random", page: "-3" })).toEqual({
      query: "",
      match: "all",
      sort: "score",
      page: 1,
    });
    expect(parseJobFilters({ page: "abc" }).page).toBe(1);
    expect(parseJobFilters({ page: "99999999" }).page).toBe(1);
  });

  it("trims the query and takes the first value of a repeated param", () => {
    expect(parseJobFilters({ q: ["  react  ", "vue"] }).query).toBe("react");
  });

  it("accepts valid values", () => {
    expect(parseJobFilters({ match: "high", sort: "newest", page: "3" })).toMatchObject({
      match: "high",
      sort: "newest",
      page: 3,
    });
  });
});

describe("buildJobsHref", () => {
  it("leaves defaults out so the plain page keeps a clean address", () => {
    expect(buildJobsHref({ query: "", match: "all", sort: "score", page: 1 })).toBe("/find-jobs");
  });

  it("round-trips non-default filters", () => {
    const filters = { query: "data analyst", match: "high", sort: "oldest", page: 2 } as const;
    const params = Object.fromEntries(new URL(`http://x${buildJobsHref(filters)}`).searchParams);

    expect(parseJobFilters(params)).toEqual(filters);
  });
});

describe("hasActiveFilters", () => {
  it("is true only for a query or a non-default match filter", () => {
    expect(hasActiveFilters({ query: "", match: "all", sort: "newest", page: 4 })).toBe(false);
    expect(hasActiveFilters({ query: "x", match: "all", sort: "score", page: 1 })).toBe(true);
    expect(hasActiveFilters({ query: "", match: "low", sort: "score", page: 1 })).toBe(true);
  });
});
