import { z } from "zod";

import { DEGREES, type Degree } from "@/lib/profile-options";
import { profileFormSchema } from "@/lib/profile-form";
import {
  MAX_FIELD_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_RESPONSIBILITIES_LENGTH,
  MAX_ROLES,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  RESUME_EXTRACTION_ERROR,
  SESSION_EXPIRED_ERROR,
} from "@/lib/utils";
import type { Education, Profile, WorkExperienceEntry } from "@/types";

/**
 * Everything the app knows about a resume extraction: the contract GPT-4o's
 * JSON is held to, how it merges into the profile, and how the browser asks for
 * one.
 *
 * It lives in `lib/` rather than `agent/` because both sides need it, and the
 * request helper is here rather than in the button so `components/` stays UI
 * only. Nothing here touches the database.
 */

/**
 * The twelve fields a resume actually contains. Preferences — job titles
 * seeking, remote preference, salary, preferred locations — and work
 * authorization are deliberately absent: a resume does not state them, so a
 * model asked for them would be inventing them. `email` is absent because the
 * form field is read-only and comes from the authenticated account.
 */
const EXTRACTED_FIELDS = {
  full_name: true,
  phone: true,
  location: true,
  linkedin_url: true,
  portfolio_url: true,
  current_title: true,
  experience_level: true,
  years_experience: true,
  skills: true,
  industries: true,
  work_experience: true,
  education: true,
} as const;

const base = profileFormSchema.pick(EXTRACTED_FIELDS);

/**
 * Every field carries a `.catch()`. A model that returns "mid-level" where the
 * enum wants "mid" should cost us that one field, not the whole extraction —
 * and a dropped field falls through to the profile's existing value in
 * `mergeExtractedProfile`, so dropping is always safe.
 *
 * `.catch()` on an array is coarser than it looks: it discards every entry, not
 * the offending one. `normalizeExtracted` therefore drops any entry that breaks
 * the schema's limits *before* parsing, so a single over-long skill cannot take
 * the other forty-nine with it.
 */
export const extractedProfileSchema = base.extend({
  full_name: base.shape.full_name.catch(null),
  phone: base.shape.phone.catch(null),
  location: base.shape.location.catch(null),
  linkedin_url: base.shape.linkedin_url.catch(null),
  portfolio_url: base.shape.portfolio_url.catch(null),
  current_title: base.shape.current_title.catch(null),
  experience_level: base.shape.experience_level.catch(null),
  years_experience: base.shape.years_experience.catch(null),
  skills: base.shape.skills.catch([]),
  industries: base.shape.industries.catch([]),
  work_experience: base.shape.work_experience.catch([]),
  education: base.shape.education.catch(null),
});

export type ExtractedProfile = z.infer<typeof extractedProfileSchema>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const record: Record<string, unknown> = { ...value };
  return record;
};

const trimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * A value longer than its column allows is dropped, not shortened. A
 * 200-character "skill" is not a skill, and a cut-off version of it would put
 * something in the form the resume never said. Dropping one entry also keeps
 * the other forty-nine, which is the whole point — `.catch()` on the array
 * would have discarded all of them.
 */
const bounded = (value: unknown, limit: number): string => {
  const text = trimmed(value);
  return text.length <= limit ? text : "";
};

/**
 * The exception to the rule above. `responsibilities` is prose rather than an
 * identifier, so a truncation still reads correctly and keeps almost all of the
 * meaning — dropping it would lose the whole paragraph over one character.
 */
const truncated = (value: unknown, limit: number): string =>
  trimmed(value).slice(0, limit);

const nullableText = (value: unknown, limit: number): string | null =>
  bounded(value, limit) || null;

/**
 * Enum values come back capitalised or spaced far more often than they come
 * back wrong: "Senior", "Bachelor's Degree", "High School". Folding the case
 * and the separator rescues those before `.catch()` would discard them.
 */
const enumish = (value: unknown): string | null => {
  const text = trimmed(value).toLowerCase().replace(/[\s-]+/g, "_");
  return text || null;
};

const isDegree = (value: string): value is Degree =>
  DEGREES.some((degree) => degree === value);

const degree = (value: unknown): string => {
  const text = enumish(value) ?? "";
  return isDegree(text) ? text : "";
};

/**
 * A resume writes a LinkedIn address the way a person says it —
 * "linkedin.com/in/name" — and `z.url()` rejects that. Supplying the scheme is
 * the difference between the field landing and being dropped.
 */
const url = (value: unknown): string | null => {
  const text = trimmed(value);
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

const wholeNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Math.round(value);
  const digits = trimmed(value).match(/\d+/);
  return digits ? Number(digits[0]) : null;
};

const tags = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => bounded(entry, MAX_TAG_LENGTH))
        .filter((entry) => entry.length > 0)
        .slice(0, MAX_TAGS)
    : [];

/**
 * The Start/End Date inputs are `type="month"`, which shows nothing unless the
 * value is exactly `YYYY-MM`. A bare year is the one near miss worth rescuing —
 * the prompt asks for `YYYY-MM` but a resume that only says "2019" often comes
 * back that way, and blanking it would lose a date we actually have.
 */
const month = (value: unknown): string => {
  const text = trimmed(value);
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}$/.test(text)) return `${text}-01`;
  return "";
};

const year = (value: unknown): string => {
  const digits = trimmed(value).match(/\d{4}/);
  return digits ? digits[0] : "";
};

/**
 * The only end dates that mean "still there". Anything else unparseable — a
 * stray "2019", a month name — is a date we failed to read, not a current role.
 * Inferring `is_current` from "we could not parse this" ticked the Currently
 * working here box on roles that ended years ago and disabled their End Date.
 */
const STILL_THERE = /^(present|current|now|ongoing|to date|to present)$/i;

const normalizeRole = (value: unknown): Record<string, unknown> => {
  const role = asRecord(value);
  const rawEnd = trimmed(role.end_date);

  return {
    company: bounded(role.company, MAX_FIELD_LENGTH),
    title: bounded(role.title, MAX_FIELD_LENGTH),
    start_date: month(role.start_date),
    end_date: month(rawEnd),
    is_current: role.is_current === true || STILL_THERE.test(rawEnd),
    responsibilities: truncated(
      role.responsibilities,
      MAX_RESPONSIBILITIES_LENGTH,
    ),
  };
};

const normalizeEducation = (value: unknown): Record<string, string> | null => {
  const education = asRecord(value);
  const normalized = {
    degree: degree(education.degree),
    field: bounded(education.field, MAX_FIELD_LENGTH),
    institution: bounded(education.institution, MAX_FIELD_LENGTH),
    graduation_year: year(education.graduation_year),
  };

  return Object.values(normalized).some((entry) => entry.length > 0)
    ? normalized
    : null;
};

/**
 * Shapes the model's JSON into what the schema expects before it is parsed.
 * The model returns empty strings where the schema wants null, capitalised
 * enums, years as numbers, and occasionally more roles or longer values than
 * the form has room for — none of which are errors worth failing over.
 */
export const normalizeExtracted = (raw: unknown): unknown => {
  const value = asRecord(raw);

  return {
    full_name: nullableText(value.full_name, MAX_FIELD_LENGTH),
    phone: nullableText(value.phone, MAX_PHONE_LENGTH),
    location: nullableText(value.location, MAX_FIELD_LENGTH),
    linkedin_url: url(value.linkedin_url),
    portfolio_url: url(value.portfolio_url),
    current_title: nullableText(value.current_title, MAX_FIELD_LENGTH),
    experience_level: enumish(value.experience_level),
    years_experience: wholeNumber(value.years_experience),
    skills: tags(value.skills),
    industries: tags(value.industries),
    work_experience: Array.isArray(value.work_experience)
      ? value.work_experience
          .map(normalizeRole)
          .filter((role) => role.company !== "" || role.title !== "")
          .slice(0, MAX_ROLES)
      : [],
    education: normalizeEducation(value.education),
  };
};

/**
 * An empty string counts as "the resume did not say", not as "the resume said
 * nothing". `??` only falls through on null, so `""` used to win and blank a
 * field the user had filled in — `normalizeExtracted` maps "" to null before
 * validating, but the merge must not depend on its caller having normalized.
 * Refusing to blank a filled field is the entire reason this function exists.
 */
const pickText = (
  extracted: string | null,
  current: string | null,
): string | null => (extracted === null || extracted === "" ? current : extracted);

const mergeEducation = (
  extracted: ExtractedProfile["education"],
  current: Education | null,
): Education | null => {
  if (!extracted) return current;

  return {
    degree: extracted.degree || (current?.degree ?? ""),
    field: extracted.field || (current?.field ?? ""),
    institution: extracted.institution || (current?.institution ?? ""),
    graduation_year:
      extracted.graduation_year || (current?.graduation_year ?? ""),
  };
};

export type MergeResult = {
  profile: Profile;
  /** How many of the twelve fields the extraction actually changed. */
  changed: number;
};

const sameValue = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

/**
 * Extracted values win, but only where there is one. A resume with no phone
 * number must not clear the phone number the user typed — this is the whole
 * difference between "populate the form" and "overwrite the form", and it is
 * why every branch below falls through to the current value.
 *
 * The `changed` count exists because the merge is allowed to change nothing at
 * all, and a form that looks identical after the button stops spinning is
 * indistinguishable from a button that did not work.
 */
export function mergeExtractedProfile(
  profile: Profile,
  extracted: ExtractedProfile,
): MergeResult {
  const roles: WorkExperienceEntry[] =
    extracted.work_experience.length > 0
      ? extracted.work_experience
      : profile.work_experience;

  const merged: Profile = {
    ...profile,
    full_name: pickText(extracted.full_name, profile.full_name),
    phone: pickText(extracted.phone, profile.phone),
    location: pickText(extracted.location, profile.location),
    linkedin_url: pickText(extracted.linkedin_url, profile.linkedin_url),
    portfolio_url: pickText(extracted.portfolio_url, profile.portfolio_url),
    current_title: pickText(extracted.current_title, profile.current_title),
    experience_level: extracted.experience_level ?? profile.experience_level,
    years_experience: extracted.years_experience ?? profile.years_experience,
    skills: extracted.skills.length > 0 ? extracted.skills : profile.skills,
    industries:
      extracted.industries.length > 0
        ? extracted.industries
        : profile.industries,
    work_experience: roles,
    education: mergeEducation(extracted.education, profile.education),
  };

  // Listed explicitly rather than looped over EXTRACTED_FIELDS, which would
  // need a cast to index Profile by a string. Adding a field to the merge above
  // means adding it here.
  const changed = [
    !sameValue(merged.full_name, profile.full_name),
    !sameValue(merged.phone, profile.phone),
    !sameValue(merged.location, profile.location),
    !sameValue(merged.linkedin_url, profile.linkedin_url),
    !sameValue(merged.portfolio_url, profile.portfolio_url),
    !sameValue(merged.current_title, profile.current_title),
    !sameValue(merged.experience_level, profile.experience_level),
    !sameValue(merged.years_experience, profile.years_experience),
    !sameValue(merged.skills, profile.skills),
    !sameValue(merged.industries, profile.industries),
    !sameValue(merged.work_experience, profile.work_experience),
    !sameValue(merged.education, profile.education),
  ].filter(Boolean).length;

  return { profile: merged, changed };
}

const responseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: extractedProfileSchema }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type ExtractionRequest =
  | { status: "ok"; data: ExtractedProfile }
  | { status: "error"; message: string };

/**
 * Asks the extract route for the caller's own resume. Parsed rather than cast:
 * this is network JSON, and the alternative to validating it is an assertion
 * that the body is whatever we hoped. It is the same schema the route validated
 * the model against, so the two cannot drift.
 */
export async function requestResumeExtraction(): Promise<ExtractionRequest> {
  try {
    const response = await fetch("/api/resume/extract", { method: "POST" });

    // The proxy sends an expired session to /login, which fetch follows — so
    // this arrives as a 200 of HTML rather than as the route's own 401.
    if (response.redirected) {
      return { status: "error", message: SESSION_EXPIRED_ERROR };
    }

    const body = responseSchema.safeParse(await response.json());

    if (!body.success) {
      console.error("[lib/resume-extraction] response shape", body.error);
      return { status: "error", message: RESUME_EXTRACTION_ERROR };
    }
    if (!body.data.success) {
      return { status: "error", message: body.data.error };
    }

    return { status: "ok", data: body.data.data };
  } catch (error) {
    console.error("[lib/resume-extraction] requestResumeExtraction", error);
    return { status: "error", message: RESUME_EXTRACTION_ERROR };
  }
}
