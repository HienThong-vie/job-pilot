/**
 * Colour bands for the match score bar, measured off `find-jobs.png` — 94, 96
 * and 91 are green, 88 and 85 blue, 72 orange. These are display bands only;
 * what counts as a strong match is `MATCH_THRESHOLD`, which is a different
 * question and lands in `lib/utils.ts` with feature 10.
 */
export const HIGH_SCORE_MIN = 90;
export const GOOD_SCORE_MIN = 80;

export type ScoreTone = "high" | "good" | "fair";

export function getScoreTone(score: number): ScoreTone {
  if (score >= HIGH_SCORE_MIN) return "high";
  if (score >= GOOD_SCORE_MIN) return "good";
  return "fair";
}
