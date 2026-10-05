import { z } from "zod";

import { ADZUNA_RESULTS_PER_PAGE } from "@/lib/utils";

const BASE_URL = "https://api.adzuna.com/v1/api/jobs";

/** A hung Adzuna request must not hold the Find Jobs button forever. */
const REQUEST_TIMEOUT_MS = 10_000;

export type AdzunaCountry = "us" | "gb" | "au" | "ca";

/**
 * Country names are checked before regions and cities, so an explicit country
 * always wins. A matched country name is also dropped from `where`: Adzuna is
 * already searching that country, and "Toronto, Canada" geocodes worse than
 * "Toronto". Anything unrecognised searches the US.
 */
const COUNTRY_NAMES: Record<AdzunaCountry, string[]> = {
  us: ["us", "usa", "united states", "united states of america", "america"],
  gb: ["uk", "united kingdom", "great britain", "britain"],
  au: ["australia"],
  ca: ["canada"],
};

/**
 * State and province names that belong to exactly one country. Ambiguous ones
 * are left out: "Georgia" is also a country, "Victoria" is also a city in BC,
 * "Washington" is also DC and a dozen towns.
 */
const STATE_NAMES: Record<Exclude<AdzunaCountry, "gb">, string[]> = {
  us: [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "hawaii", "idaho", "illinois",
    "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland",
    "massachusetts", "michigan", "minnesota", "mississippi", "missouri",
    "montana", "nebraska", "nevada", "new hampshire", "new jersey",
    "new mexico", "new york", "north carolina", "north dakota", "ohio",
    "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
    "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
    "west virginia", "wisconsin", "wyoming",
  ],
  ca: [
    "ontario", "quebec", "british columbia", "alberta", "manitoba",
    "saskatchewan", "nova scotia", "new brunswick", "newfoundland",
    "prince edward island",
  ],
  au: [
    "new south wales", "queensland", "tasmania", "western australia",
    "south australia", "northern territory",
  ],
};

/**
 * Postal codes for states and provinces, matched only as a whole
 * comma-separated part ("Cambridge, MA"). A few collide across countries — WA
 * and NT — and those are settled by the city in front of them.
 */
const STATE_CODES: Record<Exclude<AdzunaCountry, "gb">, string[]> = {
  us: [
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "dc", "fl", "ga", "hi",
    "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn",
    "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh",
    "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa",
    "wv", "wi", "wy",
  ],
  ca: ["ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt"],
  au: ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"],
};

/**
 * Cities checked last, after every name and code. That order is what keeps
 * "Cambridge, MA", "Birmingham, AL" and "London, Ontario" out of the UK: their
 * state or province is seen first. A bare "Cambridge" still means the UK one.
 */
const CITIES: Record<Exclude<AdzunaCountry, "us">, string[]> = {
  gb: [
    "england", "scotland", "wales", "northern ireland", "london",
    "manchester", "birmingham", "edinburgh", "glasgow", "bristol", "leeds",
    "liverpool", "cambridge", "oxford", "belfast",
  ],
  au: ["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "darwin", "hobart"],
  ca: [
    "toronto", "vancouver", "montreal", "ottawa", "calgary", "edmonton",
    "winnipeg", "halifax",
  ],
};

const COUNTRIES: AdzunaCountry[] = ["gb", "au", "ca", "us"];
const STATE_COUNTRIES = ["us", "ca", "au"] as const;
const CITY_COUNTRIES = ["gb", "au", "ca"] as const;

const mentions = (text: string, phrase: string): boolean =>
  new RegExp(`\\b${phrase}\\b`).test(text);

const cityCountry = (text: string): AdzunaCountry | undefined =>
  CITY_COUNTRIES.find((country) =>
    CITIES[country].some((city) => mentions(text, city)),
  );

const detectCountry = (location: string): AdzunaCountry => {
  const text = location.toLowerCase();

  const byName = COUNTRIES.find((country) =>
    COUNTRY_NAMES[country].some((name) => mentions(text, name)),
  );
  if (byName) return byName;

  const byState = STATE_COUNTRIES.find((country) =>
    STATE_NAMES[country].some((name) => mentions(text, name)),
  );
  if (byState) return byState;

  const parts = text.split(/[,/|]/).map((part) => part.trim());
  const codeOwners = STATE_COUNTRIES.filter((country) =>
    parts.some((part) => STATE_CODES[country].includes(part)),
  );
  if (codeOwners.length === 1) return codeOwners[0];
  if (codeOwners.length > 1) {
    const city = cityCountry(text);
    return codeOwners.find((country) => country === city) ?? codeOwners[0];
  }

  return cityCountry(text) ?? "us";
};

type SearchTerms = {
  country: AdzunaCountry;
  what: string;
  where: string;
};

/**
 * "Remote" is not a place, so Adzuna's geocoder cannot do anything useful with
 * it in `where`. It moves into the keywords instead, where it matches listings
 * that say they are remote.
 */
export const toSearchTerms = (jobTitle: string, location: string): SearchTerms => {
  const country = detectCountry(location);
  let remote = false;

  const parts = location
    .split(/[,/|]/)
    .map((part) => {
      const withoutRemote = part.replace(/\bremote\b/gi, " ");
      if (withoutRemote !== part) remote = true;
      return withoutRemote.replace(/\s+/g, " ").trim();
    })
    .filter(
      (part) =>
        part.length > 0 &&
        !COUNTRY_NAMES[country].includes(part.toLowerCase()),
    );

  return {
    country,
    what: remote ? `${jobTitle} remote` : jobTitle,
    where: parts.join(", "),
  };
};

/**
 * Lenient on purpose. Adzuna omits the salary and contract fields whenever it
 * has nothing for them, and `id` has been seen as both a string and a number.
 * A listing that fails this is dropped, not the whole search.
 */
const adzunaJobSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().min(1),
  company: z.object({ display_name: z.string() }).partial().optional(),
  location: z.object({ display_name: z.string() }).partial().optional(),
  description: z.string().optional(),
  redirect_url: z.url(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  contract_type: z.string().optional(),
  contract_time: z.string().optional(),
});

type AdzunaJob = z.infer<typeof adzunaJobSchema>;

const responseSchema = z.object({ results: z.array(z.unknown()) });

/** One Adzuna result in the shape of a `jobs` row, before it is scored. */
export type JobListing = {
  external_id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  about_role: string | null;
  source_url: string;
  external_apply_url: string;
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/**
 * Adzuna wraps the matched search terms in `<strong>` and escapes entities in
 * both titles and snippets. Neither belongs in a table cell or a prompt.
 */
const plainText = (value: string | undefined): string | null => {
  if (!value) return null;
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
};

const CURRENCY: Record<AdzunaCountry, string> = {
  us: "$",
  gb: "£",
  au: "A$",
  ca: "C$",
};

const thousands = (value: number): number => Math.round(value / 1000);

const formatSalary = (job: AdzunaJob, country: AdzunaCountry): string | null => {
  const symbol = CURRENCY[country];
  const { salary_min: min, salary_max: max } = job;

  if (min && max && thousands(min) !== thousands(max)) {
    return `${symbol}${thousands(min)}k - ${symbol}${thousands(max)}k`;
  }
  if (min) return `${symbol}${thousands(min)}k+`;
  if (max) return `Up to ${symbol}${thousands(max)}k`;
  return null;
};

/**
 * `contract_time` says full or part time and `contract_type` says permanent or
 * contract — two different axes. A contract is the more useful thing to know,
 * so it wins. Nothing at all stays null rather than being guessed.
 */
const jobType = (job: AdzunaJob): string | null => {
  if (job.contract_type === "contract") return "contract";
  if (job.contract_time === "full_time") return "fulltime";
  if (job.contract_time === "part_time") return "parttime";
  return null;
};

const toListing = (job: AdzunaJob, country: AdzunaCountry): JobListing => ({
  external_id: job.id,
  title: plainText(job.title) ?? job.title,
  company: plainText(job.company?.display_name),
  location: plainText(job.location?.display_name),
  salary: formatSalary(job, country),
  job_type: jobType(job),
  about_role: plainText(job.description),
  // Adzuna's terms require sending applicants through its tracked redirect.
  source_url: job.redirect_url,
  external_apply_url: job.redirect_url,
});

const normalized = (value: string | null): string =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * What makes two listings the same job to a person reading the table. Adzuna
 * gives a syndicated copy a new ad id and a new city but the same employer,
 * title and description, so the id cannot catch it and this can.
 */
export const listingKey = (job: {
  company: string | null;
  title: string | null;
  about_role: string | null;
}): string =>
  [job.company, job.title, job.about_role].map(normalized).join("|");

/** Keeps the first of each set of copies, so Adzuna's relevance order holds. */
export const collapseCopies = (listings: JobListing[]): JobListing[] => {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();

  return listings.filter((listing) => {
    const key = listingKey(listing);
    if (seenIds.has(listing.external_id) || seenKeys.has(key)) return false;
    seenIds.add(listing.external_id);
    seenKeys.add(key);
    return true;
  });
};

export type AdzunaSearchResult =
  | { success: true; listings: JobListing[] }
  | { success: false; error: string };

/**
 * One page of IT jobs for a title and location. Never throws — the error string
 * is for `agent_logs`, not for the user.
 */
export async function searchAdzuna(
  jobTitle: string,
  location: string,
): Promise<AdzunaSearchResult> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return { success: false, error: "ADZUNA_APP_ID or ADZUNA_APP_KEY is not set" };
  }

  const { country, what, where } = toSearchTerms(jobTitle, location);

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what,
    category: "it-jobs",
    results_per_page: String(ADZUNA_RESULTS_PER_PAGE),
    "content-type": "application/json",
  });
  if (where) params.set("where", where);

  try {
    const response = await fetch(`${BASE_URL}/${country}/search/1?${params}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return { success: false, error: `Adzuna responded ${response.status}` };
    }

    const body = responseSchema.safeParse(await response.json());
    if (!body.success) {
      return { success: false, error: "Adzuna response had no results array" };
    }

    const listings = body.data.results.flatMap((raw) => {
      const job = adzunaJobSchema.safeParse(raw);
      return job.success ? [toListing(job.data, country)] : [];
    });

    return { success: true, listings };
  } catch (error) {
    return { success: false, error: `Adzuna request failed: ${String(error)}` };
  }
}
