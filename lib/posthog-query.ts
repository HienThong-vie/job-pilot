import { z } from "zod";

import { POSTHOG_QUERY_TIMEOUT_MS } from "@/lib/utils";

export type PostHogQueryResult =
  | { status: "ok"; results: unknown[][] }
  | { status: "unavailable" };

const responseSchema = z.object({ results: z.array(z.array(z.unknown())) });

/**
 * The private API lives on the app host, not the ingest host the events go to:
 * us.i.posthog.com takes events, us.posthog.com takes queries. The same swap
 * `lib/posthog-client.ts` does for `ui_host`.
 */
function appHost(): string | null {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  return host ? host.replace(".i.posthog.com", ".posthog.com") : null;
}

/**
 * Runs one HogQL query against the PostHog Query API. Server-side only: the
 * personal API key reads the whole project and must never reach the browser.
 *
 * Never throws. A missing key, a rejected key, a timeout and a malformed
 * response all come back as `unavailable`, so a caller can show a message and
 * keep the rest of the page. The reason goes to the server log only.
 *
 * `values` fill the `{name}` placeholders in the query. PostHog binds them as
 * typed constants, so nothing is concatenated into the SQL.
 *
 * `name` shows up in PostHog's query_log, which is where a slow or failing
 * dashboard query gets found.
 */
export async function runHogQL(
  name: string,
  query: string,
  values: Record<string, string | number>,
): Promise<PostHogQueryResult> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = appHost();

  if (!apiKey || !projectId || !host) {
    // A warning, not an error: a checkout without a personal key is a normal
    // setup, and an error would raise Next's dev overlay on every dashboard load.
    console.warn(
      "[lib/posthog-query] POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID or NEXT_PUBLIC_POSTHOG_HOST is not set",
    );
    return { status: "unavailable" };
  }

  try {
    const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        query: { kind: "HogQLQuery", query, values },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(POSTHOG_QUERY_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Status only. The body can echo the query, which carries a user id.
      console.error("[lib/posthog-query]", name, "status", response.status);
      return { status: "unavailable" };
    }

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error("[lib/posthog-query]", name, "unexpected response shape");
      return { status: "unavailable" };
    }
    return { status: "ok", results: parsed.data.results };
  } catch (error) {
    console.error("[lib/posthog-query]", name, error);
    return { status: "unavailable" };
  }
}
