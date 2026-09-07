import type {
  ExperienceLevel,
  RemotePreference,
  WorkAuthorization,
} from "@/types";

/**
 * The single source for every profile dropdown. `ProfileForm` renders these and
 * `profile-form.ts` builds its Zod enums from the same tuples, so a value can
 * never exist in one and not the other.
 *
 * Each tuple is checked against its union in `types/index.ts` with `satisfies`,
 * and each label map is a `Record` keyed by that tuple — so adding a value
 * without a label, or a label without a value, fails to compile.
 */

type Option<T extends string> = { value: T; label: string };

const toOptions = <const T extends readonly string[]>(
  values: T,
  labels: Record<T[number], string>,
): Option<T[number]>[] =>
  values.map((value: T[number]) => ({ value, label: labels[value] }));

export const EXPERIENCE_LEVELS = [
  "junior",
  "mid",
  "senior",
  "lead",
] as const satisfies readonly ExperienceLevel[];

export const REMOTE_PREFERENCES = [
  "remote",
  "onsite",
  "hybrid",
  "any",
] as const satisfies readonly RemotePreference[];

export const WORK_AUTHORIZATIONS = [
  "citizen",
  "permanent_resident",
  "visa_required",
] as const satisfies readonly WorkAuthorization[];

export const DEGREES = [
  "high_school",
  "associate",
  "bachelors",
  "masters",
  "doctorate",
] as const;

export type Degree = (typeof DEGREES)[number];

export const EXPERIENCE_LEVEL_OPTIONS = toOptions(EXPERIENCE_LEVELS, {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
});

export const REMOTE_PREFERENCE_OPTIONS = toOptions(REMOTE_PREFERENCES, {
  remote: "Remote",
  onsite: "Onsite",
  hybrid: "Hybrid",
  any: "Any",
});

export const WORK_AUTHORIZATION_OPTIONS = toOptions(WORK_AUTHORIZATIONS, {
  citizen: "Citizen",
  permanent_resident: "Permanent Resident",
  visa_required: "Visa Required",
});

export const DEGREE_OPTIONS = toOptions(DEGREES, {
  high_school: "High School",
  associate: "Associate",
  bachelors: "Bachelor's",
  masters: "Master's",
  doctorate: "Doctorate",
});
