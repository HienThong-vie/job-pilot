import { z } from "zod";

import {
  MAX_BULLETS_PER_ROLE,
  MAX_BULLET_LENGTH,
  MAX_ROLES,
  MAX_SUMMARY_LENGTH,
  RESUME_GENERATION_ERROR,
  SESSION_EXPIRED_ERROR,
} from "@/lib/utils";
import type { Profile, WorkExperienceEntry } from "@/types";

/**
 * Everything the app knows about a generated resume: the contract GPT-4o's
 * JSON is held to, and how the browser asks for one.
 *
 * The mirror of `lib/resume-extraction.ts`, and here for the same reasons — the
 * agent and the PDF document both need the shape, and the request helper lives
 * beside it so `components/` stays UI only.
 *
 * Note what is *not* here: no profile fields. The model writes prose and
 * nothing else. Name, contact details, companies, titles, dates, skills and
 * education are rendered straight from the profile row, so the model has no
 * opportunity to invent a phone number or a job the user never held.
 */

/**
 * Roles are addressed by their **index** in `profile.work_experience`, never by
 * company name. Matching on a name would mean deciding what to do when the
 * model returns "Vercel Inc." for a row that says "Vercel" — and getting that
 * wrong attaches one job's bullets to another job's title, which is the single
 * worst thing this feature could do. An index either lines up or is dropped.
 */
export const generatedResumeSchema = z.object({
  summary: z.string().max(MAX_SUMMARY_LENGTH),
  roles: z
    .array(
      z.object({
        index: z
          .number()
          .int()
          .min(0)
          .max(MAX_ROLES - 1),
        bullets: z
          .array(z.string().min(1).max(MAX_BULLET_LENGTH))
          .max(MAX_BULLETS_PER_ROLE),
      }),
    )
    .max(MAX_ROLES),
});

export type GeneratedResume = z.infer<typeof generatedResumeSchema>;

const trimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * The roles that belong on a resume, in the order they will be printed.
 *
 * **Both the writer and the document must call this**, because the indices the
 * model returns are positions in *this* list. If the document filtered the
 * roles differently from the prompt, the bullets for one job would print under
 * another job's title — the exact failure indexing was chosen to prevent.
 *
 * A role needs a title or a company to be worth printing. `workExperienceSchema`
 * allows every field to be `""` and `getProfileCompletion` only counts entries,
 * so a user who presses "Add role" and saves without filling it in has a blank
 * row on their profile. Printed, it is a gap in the middle of the resume; sent
 * to the model, it is a request to write bullets about nothing.
 */
export const resumeRoles = (
  profile: Pick<Profile, "work_experience">,
): WorkExperienceEntry[] =>
  profile.work_experience
    .filter(
      (role) => role.title.trim() !== "" || role.company.trim() !== "",
    )
    .slice(0, MAX_ROLES);

/**
 * Trims the model's output to fit *before* validation, entry by entry.
 *
 * This is feature 07's lesson applied to a different shape: a `.catch()` on an
 * array discards every element rather than the offending one, so one bullet
 * four characters over the limit would silently cost a role all three of its
 * bullets. Over-long bullets are truncated rather than dropped — a bullet is
 * prose, so a slightly shortened one still reads, whereas a role rendered with
 * no bullets at all looks like a bug.
 */
export function normalizeGenerated(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { summary: "", roles: [] };
  }

  const record: Record<string, unknown> = { ...value };
  const roles = Array.isArray(record.roles) ? record.roles : [];

  return {
    summary: trimmed(record.summary).slice(0, MAX_SUMMARY_LENGTH),
    roles: roles
      .flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const role: Record<string, unknown> = { ...entry };

        // A non-integer index cannot be lined up with a role, and guessing
        // which one was meant is exactly the mistake indexing avoids.
        //
        // The range is checked *here* rather than left to the schema. The
        // schema does bound it, but a schema failure rejects the entire
        // generation — so an index of 5 against three roles would cost the user
        // their whole resume instead of one role's bullets. Same shape as the
        // over-long-skill bug in feature 07: drop the entry, keep the batch.
        if (
          typeof role.index !== "number" ||
          !Number.isInteger(role.index) ||
          role.index < 0 ||
          role.index >= MAX_ROLES
        ) {
          return [];
        }

        const bullets = Array.isArray(role.bullets) ? role.bullets : [];

        return [
          {
            index: role.index,
            bullets: bullets
              .map((bullet) => trimmed(bullet).slice(0, MAX_BULLET_LENGTH))
              .filter((bullet) => bullet.length > 0)
              .slice(0, MAX_BULLETS_PER_ROLE),
          },
        ];
      })
      .slice(0, MAX_ROLES),
  };
}

/**
 * What the document should render under the role at `index`. Returns an empty
 * array when the model skipped that role, which the document renders as a role
 * with no bullets rather than as an error — the title, company and dates are
 * still true and still worth printing.
 */
export const bulletsForRole = (
  generated: GeneratedResume,
  index: number,
): string[] =>
  generated.roles.find((role) => role.index === index)?.bullets ?? [];

const responseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type GenerationRequest =
  | { status: "ok" }
  | { status: "error"; message: string };

/**
 * Asks the generate route for a PDF built from the caller's own saved profile.
 * Takes no arguments for the same reason the extract request does: everything
 * it needs comes off the session's row, so there is nothing for a client to say.
 *
 * The PDF itself never comes back through here — it goes straight from the
 * route into storage, and the browser reads it through `/api/resume/view` like
 * any other resume.
 */
export async function requestResumeGeneration(): Promise<GenerationRequest> {
  try {
    const response = await fetch("/api/resume/generate", { method: "POST" });

    // The proxy sends an expired session to /login, which fetch follows — so
    // this arrives as a 200 of HTML rather than as the route's own 401.
    if (response.redirected) {
      return { status: "error", message: SESSION_EXPIRED_ERROR };
    }

    const body = responseSchema.safeParse(await response.json());

    if (!body.success) {
      console.error("[lib/resume-generation] response shape", body.error);
      return { status: "error", message: RESUME_GENERATION_ERROR };
    }
    if (!body.data.success) {
      return { status: "error", message: body.data.error };
    }

    return { status: "ok" };
  } catch (error) {
    console.error("[lib/resume-generation] requestResumeGeneration", error);
    return { status: "error", message: RESUME_GENERATION_ERROR };
  }
}
