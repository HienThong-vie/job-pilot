import { z } from "zod";

import { RESEARCH_ERROR, SESSION_EXPIRED_ERROR } from "@/lib/utils";

/**
 * The Research Company request contract. Both the route and the button use it,
 * so it lives in `lib/` rather than in either one — like `lib/job-search.ts`.
 */

export const researchRequestSchema = z.object({
  jobId: z.uuid(),
});

const responseSchema = z.discriminatedUnion("success", [
  // The route returns the dossier, but the page re-reads it on refresh, so the
  // button only needs to know it worked.
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type ResearchRequestResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function requestCompanyResearch(
  jobId: string,
): Promise<ResearchRequestResult> {
  try {
    const response = await fetch("/api/agent/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });

    // The proxy sends an expired session to /login, which fetch follows — so
    // this arrives as a 200 of HTML rather than as the route's own 401.
    if (response.redirected) {
      return { status: "error", message: SESSION_EXPIRED_ERROR };
    }

    const body = responseSchema.safeParse(await response.json());
    if (!body.success) {
      console.error("[lib/company-research] response shape", body.error);
      return { status: "error", message: RESEARCH_ERROR };
    }
    if (!body.data.success) {
      return { status: "error", message: body.data.error };
    }
    return { status: "ok" };
  } catch (error) {
    console.error("[lib/company-research] requestCompanyResearch", error);
    return { status: "error", message: RESEARCH_ERROR };
  }
}
