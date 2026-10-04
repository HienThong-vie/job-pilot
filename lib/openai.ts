import OpenAI from "openai";

import { OPENAI_TIMEOUT_MS } from "@/lib/utils";

/**
 * Every GPT-4o call in this project goes through OpenRouter, not the OpenAI
 * API directly — the key in `.env.local` is an OpenRouter key, which is why the
 * model string carries the `openai/` namespace. Features 10, 11 and 12 make the
 * same call; the model belongs here rather than being retyped in each.
 */
const BASE_URL = "https://openrouter.ai/api/v1";

export const GPT_4O = "openai/gpt-4o";

const apiKey = process.env.OPENROUTER_API_KEY;

/**
 * Returns null rather than throwing when the key is absent, following
 * `createPostHogServer`. A missing key must surface as a handled "could not
 * read your resume" on the one route that needs it, not as a module-level
 * throw that takes down every page importing anything downstream of it.
 */
export function createOpenAI(): OpenAI | null {
  if (!apiKey) return null;

  // The SDK waits forever by default, which turns a hung upstream into a button
  // that spins until the user reloads. `maxRetries` is pinned because the
  // default of 2 multiplies the timeout — three attempts at 60s is a five
  // minute worst case for a request a person is sitting and waiting on.
  return new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 1,
  });
}
