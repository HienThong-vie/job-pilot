import type { Profile } from "@/types";

export type ProfileCompletion = {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
};

/**
 * Only the fields the check actually reads. A full `Profile` satisfies this,
 * so the page passes its row straight in; `saveProfile` can pass the parsed
 * form payload without inventing the columns it does not write.
 */
export type ProfileCompletionInput = Pick<
  Profile,
  | "full_name"
  | "email"
  | "phone"
  | "location"
  | "current_title"
  | "experience_level"
  | "years_experience"
  | "skills"
  | "work_experience"
  | "education"
>;

type RequiredField = {
  label: string;
  isFilled: (profile: ProfileCompletionInput) => boolean;
};

const hasText = (value: string | null): boolean =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Ten equally weighted fields, so the percentage always lands on a multiple of
 * ten. Optional fields (industries, salary, preferred locations, the URLs) are
 * deliberately excluded — a profile is usable for matching without them.
 */
const REQUIRED_FIELDS: RequiredField[] = [
  { label: "FULL NAME", isFilled: (p) => hasText(p.full_name) },
  { label: "EMAIL", isFilled: (p) => hasText(p.email) },
  { label: "PHONE", isFilled: (p) => hasText(p.phone) },
  { label: "LOCATION", isFilled: (p) => hasText(p.location) },
  { label: "JOB TITLE", isFilled: (p) => hasText(p.current_title) },
  { label: "EXPERIENCE LEVEL", isFilled: (p) => hasText(p.experience_level) },
  { label: "YEARS OF EXPERIENCE", isFilled: (p) => p.years_experience !== null },
  { label: "SKILLS", isFilled: (p) => p.skills.length > 0 },
  { label: "WORK EXPERIENCE", isFilled: (p) => p.work_experience.length > 0 },
  {
    label: "EDUCATION",
    isFilled: (p) =>
      p.education !== null &&
      hasText(p.education.institution) &&
      hasText(p.education.graduation_year),
  },
];

export function getProfileCompletion(
  profile: ProfileCompletionInput,
): ProfileCompletion {
  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !field.isFilled(profile),
  ).map((field) => field.label);

  const filledCount = REQUIRED_FIELDS.length - missingFields.length;

  return {
    percentage: Math.round((filledCount / REQUIRED_FIELDS.length) * 100),
    missingFields,
    isComplete: missingFields.length === 0,
  };
}
