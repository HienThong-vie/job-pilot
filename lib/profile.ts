import { createInsforgeServer } from "@/lib/insforge-server";
import type { Education, Profile, WorkExperienceEntry } from "@/types";

const hasText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

/**
 * `profiles.education` is `jsonb not null default '{}'`, so a user who has
 * never filled the section reads back as an empty object rather than null.
 * Collapse that to null here so the rest of the app can trust `Profile`.
 */
const normalizeEducation = (value: unknown): Education | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const entries = Object.values(value);
  if (!entries.some(hasText)) return null;

  const record: Record<string, unknown> = { ...value };
  return {
    degree: typeof record.degree === "string" ? record.degree : "",
    field: typeof record.field === "string" ? record.field : "",
    institution:
      typeof record.institution === "string" ? record.institution : "",
    graduation_year:
      typeof record.graduation_year === "string" ? record.graduation_year : "",
  };
};

const normalizeWorkExperience = (value: unknown): WorkExperienceEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record: Record<string, unknown> = { ...entry };

    return [
      {
        company: typeof record.company === "string" ? record.company : "",
        title: typeof record.title === "string" ? record.title : "",
        start_date:
          typeof record.start_date === "string" ? record.start_date : "",
        end_date: typeof record.end_date === "string" ? record.end_date : "",
        is_current: record.is_current === true,
        responsibilities:
          typeof record.responsibilities === "string"
            ? record.responsibilities
            : "",
      },
    ];
  });
};

/**
 * Why this is a result type rather than `Profile | null`: the caller redirects
 * to /login when there is no session, and collapsing a failed read into the
 * same null would log a signed-in user out because of a momentary backend
 * blip. `handle_new_user()` inserts a row for every user at signup, so a
 * signed-in caller always has exactly one — "not found" is a real failure.
 */
export type ProfileResult =
  | { status: "ok"; profile: Profile }
  | { status: "unauthenticated" }
  | { status: "error" };

export async function getCurrentProfile(): Promise<ProfileResult> {
  const insforge = await createInsforgeServer();
  const { data: session } = await insforge.auth.getCurrentUser();
  if (!session.user) return { status: "unauthenticated" };

  const { data, error } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !data) {
    console.error("[lib/profile] getCurrentProfile", error);
    return { status: "error" };
  }

  // PostgREST hands back an untyped row; the two jsonb columns are normalized
  // above and the rest map straight onto their column types.
  const row = data as Profile;

  return {
    status: "ok",
    profile: {
      ...row,
      education: normalizeEducation(row.education),
      work_experience: normalizeWorkExperience(row.work_experience),
    },
  };
}
