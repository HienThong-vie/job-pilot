import OpenAI from "openai";

import { OPENAI_TIMEOUT_MS } from "@/lib/utils";

/**
 * Every model call in this project goes through OpenRouter, not the OpenAI
 * API directly — the key in `.env.local` is an OpenRouter key, which is why
 * model ids carry a vendor namespace. Every feature takes its model from here
 * rather than naming one, so switching is one setting.
 */
const BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_MODEL = "openai/gpt-4o";

/**
 * `OPENROUTER_MODEL` overrides GPT-4o. Set on 2026-10-10 to
 * `nvidia/nemotron-3-super-120b-a12b:free` because the account has no credits:
 * free (`:free`) models cost nothing but have daily request caps. Remove the
 * variable to go back to GPT-4o.
 */
export const CHAT_MODEL = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;

/**
 * OpenRouter's own request field, not part of the OpenAI SDK's types.
 * Nemotron reasons before answering by default, and those hidden tokens count
 * against `max_tokens`: a 300-token scoring call spent 178 of them on
 * reasoning. With reasoning off it answered in 85 tokens and a quarter of the
 * time, with valid JSON. GPT-4o does not reason, so nothing is sent for it.
 */
type OpenRouterParams = { reasoning?: { enabled: boolean } };

/** Spread into every `chat.completions.create` call in place of `model`. */
export const MODEL_PARAMS: { model: string } & OpenRouterParams =
  CHAT_MODEL === DEFAULT_MODEL
    ? { model: CHAT_MODEL }
    : { model: CHAT_MODEL, reasoning: { enabled: false } };

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
