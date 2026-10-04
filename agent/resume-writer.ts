import { createOpenAI, GPT_4O } from "@/lib/openai";
import {
  generatedResumeSchema,
  normalizeGenerated,
  resumeRoles,
  type GeneratedResume,
} from "@/lib/resume-generation";
import {
  MAX_BULLETS_PER_ROLE,
  MAX_BULLET_LENGTH,
  MAX_SUMMARY_LENGTH,
  RESUME_GENERATION_ERROR,
  RESUME_WRITE_TIMEOUT_MS,
} from "@/lib/utils";
import type { Profile } from "@/types";

export type GenerationResult =
  | { success: true; data: GeneratedResume }
  | { success: false; error: string };

/**
 * Three roles at three bullets each is roughly 400 tokens of prose, the summary
 * another 150, and the JSON scaffolding the rest. Same failure mode as the
 * extractor: a truncated `json_object` response fails to parse, and that would
 * be reported to the user as a broken resume rather than as a budget we set too
 * low — so `finish_reason` is checked before the parse, not after.
 */
const MAX_TOKENS = 900;

/**
 * Higher than the extractor's 0.3. Extraction is a transcription task where
 * invention is the enemy; this is a writing task, and prose at 0.3 reads like
 * every bullet came out of the same mould.
 */
const TEMPERATURE = 0.6;

const SYSTEM_PROMPT = `You write the prose for a professional single-page resume. Return only valid JSON.

You are given a person's profile. Return an object with exactly these keys:

- summary: string — a professional summary of 2 to 3 sentences, at most ${MAX_SUMMARY_LENGTH} characters
- roles: array of objects, one per role you were given, each with:
    index: integer — copy the role's index exactly as given
    bullets: array of ${MAX_BULLETS_PER_ROLE} strings at most

Rules for the summary:
- Write in the third person with no pronouns. Start like "Senior engineer with eight years...".
- State only what the profile says: the title, the years of experience, the skills and the industries.
- Never name an employer, a metric, or an achievement that is not in the profile.

Rules for the bullets:
- ${MAX_BULLETS_PER_ROLE} at most per role, each one sentence, at most ${MAX_BULLET_LENGTH} characters.
- Rewrite the role's responsibilities into achievement-oriented lines. Start each with a past-tense verb ("Built", "Led", "Migrated"), or present tense for a current role.
- Never invent a number. If the responsibilities state no metric, write the bullet without one.
- Never repeat the job title or the company name inside a bullet — both are printed above it.
- If a role's responsibilities are empty, return that role with an empty bullets array. Do not make something up.

Return one entry per role given, keeping its index. Never add a role that was not given.`;

type PromptRole = {
  index: number;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string;
};

type PromptInput = {
  current_title: string | null;
  experience_level: string | null;
  years_experience: number | null;
  skills: string[];
  industries: string[];
  roles: PromptRole[];
};

/**
 * The only part of the profile the model sees.
 *
 * Deliberately narrow: the name, email, phone, location, URLs and education are
 * never sent, because the model is not writing them — the PDF prints them from
 * the row. What is not in the prompt cannot come back hallucinated, and a
 * resume with the wrong phone number on it is worse than no resume.
 *
 * The roles come from `resumeRoles`, which is also what the document renders.
 * The two must use the same list or the indices in the response point at
 * different jobs in each.
 */
const promptInput = (profile: Profile): PromptInput => ({
  current_title: profile.current_title,
  experience_level: profile.experience_level,
  years_experience: profile.years_experience,
  skills: profile.skills,
  industries: profile.industries,
  roles: resumeRoles(profile).map((role, index) => ({
    index,
    title: role.title,
    company: role.company,
    start_date: role.start_date,
    end_date: role.is_current ? "present" : role.end_date,
    is_current: role.is_current,
    responsibilities: role.responsibilities,
  })),
});

/**
 * Writes the summary and the per-role bullets for a resume PDF.
 *
 * Returns prose only — see `lib/resume-generation.ts` for why. The caller
 * renders it alongside the profile's own facts.
 */
export async function writeResumeContent(
  profile: Profile,
): Promise<GenerationResult> {
  try {
    const openai = createOpenAI();
    if (!openai) {
      console.error("[agent/resume-writer] OPENROUTER_API_KEY is not set");
      return { success: false, error: RESUME_GENERATION_ERROR };
    }

    const response = await openai.chat.completions.create(
      {
        model: GPT_4O,
        response_format: { type: "json_object" },
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(promptInput(profile)) },
        ],
      },
      // Tighter than the client default, which has to accommodate the
      // extractor's vision pass. Writing text is a five-second call; anything
      // past this is a hung connection, and the alternative to giving up is a
      // button that spins until the user reloads the page.
      { timeout: RESUME_WRITE_TIMEOUT_MS },
    );

    const choice = response.choices[0];

    if (choice?.finish_reason === "length") {
      console.error("[agent/resume-writer] response truncated at max_tokens");
      return { success: false, error: RESUME_GENERATION_ERROR };
    }

    const content = choice?.message.content;
    if (!content) {
      console.error("[agent/resume-writer] empty completion");
      return { success: false, error: RESUME_GENERATION_ERROR };
    }

    const parsed = generatedResumeSchema.safeParse(
      normalizeGenerated(JSON.parse(content)),
    );

    if (!parsed.success) {
      console.error("[agent/resume-writer] schema", parsed.error);
      return { success: false, error: RESUME_GENERATION_ERROR };
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    console.error("[agent/resume-writer] writeResumeContent", error);
    return { success: false, error: RESUME_GENERATION_ERROR };
  }
}
