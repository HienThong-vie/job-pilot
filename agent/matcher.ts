import { z } from "zod";

import type { JobListing } from "@/lib/adzuna";
import { createOpenAI, GPT_4O } from "@/lib/openai";
import { JOB_SCORE_TIMEOUT_MS, MAX_TAG_LENGTH } from "@/lib/utils";
import type { Profile } from "@/types";

/**
 * `library-docs.md` budgets 300 tokens for scoring. That only holds because the
 * prompt bounds the two open-ended fields: the reason at three sentences and
 * each skills list at eight entries.
 */
const MAX_TOKENS = 300;
const TEMPERATURE = 0.3;
const MAX_SKILLS = 8;

/**
 * Ten of these run per search, so the profile's longest field is cut short.
 * The first few hundred characters of a role say what the person did; the rest
 * is input tokens paid ten times over for little change in the score.
 */
const MAX_PROMPT_RESPONSIBILITIES = 400;

const SYSTEM_PROMPT = `You score how well a job listing fits a candidate. Return only valid JSON.

You are given the candidate's profile and a job listing. The listing's description is a short snippet, not the full posting.

Return an object with exactly these keys:
- matchScore: integer from 0 to 100
- matchReason: string, at most 3 sentences, explaining the score to the candidate in the second person ("You have...")
- matchedSkills: array of at most ${MAX_SKILLS} strings — entries copied exactly from the candidate's skills list that the listing's title or snippet names word for word
- missingSkills: array of at most ${MAX_SKILLS} strings — technologies, tools, languages or domain skills the listing's title or snippet names that are not in the candidate's skills list

How to score:
- 90-100: the title, seniority and the skills the listing names all line up.
- 70-89: a strong fit with one or two gaps.
- 50-69: a related role with several gaps, or a seniority mismatch.
- below 50: a different discipline or mostly missing skills.

Rules:
- Only use what is written in the listing. A frontend role does not "imply" React; if the snippet does not say React, React is not a matched skill.
- If the listing names no specific skills, matchedSkills is empty. Score on title and seniority alone, at most 85, and say in matchReason that the listing gave no skills to compare.
- missingSkills are concrete skills only. Never a job title, a seniority level, years of experience, or a soft trait like "leadership".`;

const scoreSchema = z.object({
  matchScore: z.number().transform((value) =>
    Math.min(100, Math.max(0, Math.round(value))),
  ),
  matchReason: z.string().trim().min(1),
  matchedSkills: z.array(z.string()).catch([]),
  missingSkills: z.array(z.string()).catch([]),
});

export type JobScore = {
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

export type ScoreResult =
  | { success: true; data: JobScore }
  | { success: false; error: string };

/**
 * Lowercase words with punctuation flattened to spaces, padded so a phrase can
 * be matched on whole words: "Next.js" and "next js" both become " next js ",
 * and "react" does not match inside "reactive". `+` and `#` survive for C++/C#.
 */
const words = (text: string): string =>
  ` ${text.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim()} `;

const mentions = (haystack: string, skill: string): boolean => {
  const needle = words(skill);
  return needle.trim().length > 0 && haystack.includes(needle);
};

/**
 * The model's skill lists are not trusted to follow the prompt. In feature 10's
 * first runs it put the candidate's own React / TypeScript / Next.js under
 * "matched" for two thirds of listings that never named them — and feature 12
 * shows these lists as the listing's requirements. So both are enforced here:
 *
 * - matched: in the candidate's skills (their spelling wins) AND named by the
 *   listing.
 * - missing: named by the listing AND not in the candidate's skills.
 *
 * Anything else is dropped rather than repaired — an empty list is honest, a
 * guessed one is not.
 */
const groundSkills = (
  data: z.infer<typeof scoreSchema>,
  profile: Profile,
  listing: JobListing,
): Pick<JobScore, "matchedSkills" | "missingSkills"> => {
  const listingText = words(`${listing.title} ${listing.about_role ?? ""}`);
  const candidate = new Map(
    profile.skills.map((skill) => [words(skill), skill.trim()]),
  );

  const usable = (skill: string): boolean =>
    skill.trim().length > 0 && skill.trim().length <= MAX_TAG_LENGTH;

  const matchedSkills = [
    ...new Set(
      data.matchedSkills
        .filter((skill) => usable(skill) && mentions(listingText, skill))
        .flatMap((skill) => {
          const own = candidate.get(words(skill));
          return own ? [own] : [];
        }),
    ),
  ].slice(0, MAX_SKILLS);

  const missingSkills = [
    ...new Set(
      data.missingSkills
        .map((skill) => skill.trim())
        .filter(
          (skill) =>
            usable(skill) &&
            mentions(listingText, skill) &&
            !candidate.has(words(skill)),
        ),
    ),
  ].slice(0, MAX_SKILLS);

  return { matchedSkills, missingSkills };
};

/**
 * Only what bears on fit. Name, contact details, URLs and salary never reach
 * the model — it has no use for them, and what is not sent cannot leak into a
 * stored match reason.
 */
const promptInput = (profile: Profile, listing: JobListing) => ({
  candidate: {
    current_title: profile.current_title,
    experience_level: profile.experience_level,
    years_experience: profile.years_experience,
    skills: profile.skills,
    industries: profile.industries,
    job_titles_seeking: profile.job_titles_seeking,
    remote_preference: profile.remote_preference,
    roles: profile.work_experience.map((role) => ({
      title: role.title,
      company: role.company,
      responsibilities: role.responsibilities.slice(
        0,
        MAX_PROMPT_RESPONSIBILITIES,
      ),
    })),
  },
  listing: {
    title: listing.title,
    company: listing.company,
    location: listing.location,
    job_type: listing.job_type,
    snippet: listing.about_role,
  },
});

/** Scores one listing against the profile. Never throws. */
export async function scoreJob(
  profile: Profile,
  listing: JobListing,
): Promise<ScoreResult> {
  try {
    const openai = createOpenAI();
    if (!openai) {
      return { success: false, error: "OPENROUTER_API_KEY is not set" };
    }

    const response = await openai.chat.completions.create(
      {
        model: GPT_4O,
        response_format: { type: "json_object" },
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(promptInput(profile, listing)),
          },
        ],
      },
      // No retry: a failed score costs one job, which is logged and skipped,
      // while a retry would hold the whole search for another full timeout.
      { timeout: JOB_SCORE_TIMEOUT_MS, maxRetries: 0 },
    );

    const choice = response.choices[0];

    if (choice?.finish_reason === "length") {
      return { success: false, error: "score response truncated at max_tokens" };
    }

    const content = choice?.message.content;
    if (!content) {
      return { success: false, error: "empty score completion" };
    }

    const parsed = scoreSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return { success: false, error: `score schema: ${parsed.error.message}` };
    }

    return {
      success: true,
      data: {
        matchScore: parsed.data.matchScore,
        matchReason: parsed.data.matchReason,
        ...groundSkills(parsed.data, profile, listing),
      },
    };
  } catch (error) {
    return { success: false, error: `score failed: ${String(error)}` };
  }
}
