import { z } from "zod";

import {
  DEGREES,
  EXPERIENCE_LEVELS,
  REMOTE_PREFERENCES,
  WORK_AUTHORIZATIONS,
} from "@/lib/profile-options";

/**
 * Reading and validating the profile form. Kept out of the Server Action so it
 * can be exercised on its own, and so feature 07 can validate GPT-4o's
 * extracted profile against the same schema.
 *
 * Every constraint carries its own message. A bare Zod message ("Too big:
 * expected string to have <=200 characters") would be shown to the user
 * verbatim, which `code-standards.md` forbids.
 */

const MAX_ROLES = 3;

const tooLong = (limit: number) =>
  `is too long (${limit} characters maximum)`;

const tooMany = (limit: number) => `cannot have more than ${limit} entries`;

const OPTION_ERROR = "is not one of the available options";

export const workExperienceSchema = z.object({
  company: z.string().max(200, tooLong(200)),
  title: z.string().max(200, tooLong(200)),
  start_date: z.string().max(20, tooLong(20)),
  end_date: z.string().max(20, tooLong(20)),
  is_current: z.boolean(),
  responsibilities: z.string().max(2000, tooLong(2000)),
});

const educationSchema = z.object({
  degree: z.union([z.literal(""), z.enum(DEGREES, OPTION_ERROR)]),
  field: z.string().max(200, tooLong(200)),
  institution: z.string().max(200, tooLong(200)),
  graduation_year: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}$/, "must be a four digit year"),
  ]),
});

export const profileFormSchema = z.object({
  full_name: z.string().max(200, tooLong(200)).nullable(),
  phone: z.string().max(50, tooLong(50)).nullable(),
  location: z.string().max(200, tooLong(200)).nullable(),
  linkedin_url: z.url("must be a full URL, including https://").nullable(),
  portfolio_url: z.url("must be a full URL, including https://").nullable(),
  work_authorization: z.enum(WORK_AUTHORIZATIONS, OPTION_ERROR).nullable(),
  current_title: z.string().max(200, tooLong(200)).nullable(),
  experience_level: z.enum(EXPERIENCE_LEVELS, OPTION_ERROR).nullable(),
  years_experience: z
    .number("must be a whole number")
    .int("must be a whole number")
    .min(0, "cannot be negative")
    .max(60, "cannot be more than 60")
    .nullable(),
  skills: z.array(z.string().max(60, tooLong(60))).max(50, tooMany(50)),
  industries: z.array(z.string().max(60, tooLong(60))).max(50, tooMany(50)),
  work_experience: z
    .array(workExperienceSchema)
    .max(MAX_ROLES, tooMany(MAX_ROLES)),
  education: educationSchema.nullable(),
  job_titles_seeking: z
    .array(z.string().max(120, tooLong(120)))
    .max(20, tooMany(20)),
  remote_preference: z.enum(REMOTE_PREFERENCES, OPTION_ERROR).nullable(),
  salary_expectation: z.string().max(100, tooLong(100)).nullable(),
  preferred_locations: z
    .array(z.string().max(120, tooLong(120)))
    .max(20, tooMany(20)),
});

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  phone: "Phone number",
  location: "Location",
  linkedin_url: "LinkedIn URL",
  portfolio_url: "Portfolio / GitHub",
  work_authorization: "Work authorization",
  current_title: "Current job title",
  experience_level: "Experience level",
  years_experience: "Years of experience",
  skills: "Skills",
  industries: "Industries",
  work_experience: "Work experience",
  education: "Education",
  job_titles_seeking: "Job titles seeking",
  remote_preference: "Remote preference",
  salary_expectation: "Salary expectation",
  preferred_locations: "Preferred locations",
  degree: "Highest degree",
  graduation_year: "Graduation year",
  institution: "Institution name",
  company: "Company name",
  start_date: "Start date",
  end_date: "End date",
  responsibilities: "Key responsibilities",
};

/**
 * The deepest named segment, so a failure inside the education or work
 * experience objects reports the field the user can actually see rather than
 * the container it sits in.
 */
export const firstIssueMessage = (error: z.ZodError): string => {
  const issue = error.issues[0];
  const named = issue?.path.filter((segment) => typeof segment === "string");
  const field = named?.[named.length - 1];
  const label =
    typeof field === "string" ? (FIELD_LABELS[field] ?? field) : "One field";

  return `${label} ${issue?.message ?? "is not valid"}.`;
};

const text = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const nullableText = (formData: FormData, name: string): string | null =>
  text(formData, name) || null;

/**
 * Every `text[]` column on the form is a `TagInput`, which emits one hidden
 * input per tag under a single name. Nothing splits on commas any more — a tag
 * is free to contain one ("San Francisco, CA").
 */
const repeated = (formData: FormData, name: string): string[] =>
  formData
    .getAll(name)
    .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
    .filter((value) => value.length > 0);

const nullableNumber = (formData: FormData, name: string): number | null => {
  const value = text(formData, name);
  if (value.length === 0) return null;
  return Number(value);
};

const WORK_EXPERIENCE_KEY = /^work_experience\[(\d+)\]\[([a-z_]+)\]$/;

/**
 * `WorkExperienceList` emits one input per field per role, named
 * `work_experience[0][company]`. Two quirks of native form encoding to respect:
 * an unchecked checkbox submits nothing at all (so absence means false), and a
 * disabled input submits nothing either — which is exactly what happens to
 * End Date once "Currently working here" is ticked.
 */
const readWorkExperience = (formData: FormData): unknown[] => {
  const byIndex = new Map<number, Record<string, string>>();

  for (const [key, value] of formData.entries()) {
    const match = WORK_EXPERIENCE_KEY.exec(key);
    if (!match || typeof value !== "string") continue;

    const index = Number(match[1]);
    const fields = byIndex.get(index) ?? {};
    fields[match[2]] = value.trim();
    byIndex.set(index, fields);
  }

  return [...byIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, fields]) => ({
      company: fields.company ?? "",
      title: fields.title ?? "",
      start_date: fields.start_date ?? "",
      end_date: fields.end_date ?? "",
      is_current: fields.is_current !== undefined,
      responsibilities: fields.responsibilities ?? "",
    }))
    .filter((role) => role.company.length > 0 || role.title.length > 0)
    .slice(0, MAX_ROLES);
};

const readEducation = (formData: FormData): unknown => {
  const education = {
    degree: text(formData, "education_degree"),
    field: text(formData, "education_field"),
    institution: text(formData, "education_institution"),
    graduation_year: text(formData, "education_graduation_year"),
  };

  const isEmpty = Object.values(education).every(
    (value) => value.length === 0,
  );

  return isEmpty ? null : education;
};

export const readProfileForm = (formData: FormData): unknown => ({
  full_name: nullableText(formData, "full_name"),
  phone: nullableText(formData, "phone"),
  location: nullableText(formData, "location"),
  linkedin_url: nullableText(formData, "linkedin_url"),
  portfolio_url: nullableText(formData, "portfolio_url"),
  work_authorization: nullableText(formData, "work_authorization"),
  current_title: nullableText(formData, "current_title"),
  experience_level: nullableText(formData, "experience_level"),
  years_experience: nullableNumber(formData, "years_experience"),
  skills: repeated(formData, "skills"),
  industries: repeated(formData, "industries"),
  work_experience: readWorkExperience(formData),
  education: readEducation(formData),
  job_titles_seeking: repeated(formData, "job_titles_seeking"),
  remote_preference: nullableText(formData, "remote_preference"),
  salary_expectation: nullableText(formData, "salary_expectation"),
  preferred_locations: repeated(formData, "preferred_locations"),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
