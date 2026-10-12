import { after, NextResponse, type NextRequest } from "next/server";

import { researchCompany } from "@/agent/research";
import { trackCompanyResearched } from "@/lib/analytics";
import { researchRequestSchema } from "@/lib/company-research";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getResearchJob } from "@/lib/jobs";
import { getCurrentProfile } from "@/lib/profile";
import {
  RESEARCH_AI_UNAVAILABLE_ERROR,
  RESEARCH_ERROR,
  RESEARCH_KEPT_ERROR,
  SESSION_EXPIRED_ERROR,
} from "@/lib/utils";

/**
 * Synchronous: Stagehand drives the Browserbase session from this process, so
 * the request lasts as long as the research. Every step of it is bounded — the
 * budget in `lib/utils.ts` adds up to about 225 seconds in the worst case —
 * leaving the rest for the save and the PostHog flush in `after()`.
 */
export const maxDuration = 240;

/**
 * Researches one job's company and saves the dossier to
 * `jobs.company_research`, replacing any earlier one.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate before reading the body: everything below spends a
    // Browserbase session and several GPT-4o calls.
    const result = await getCurrentProfile();

    if (result.status === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: SESSION_EXPIRED_ERROR },
        { status: 401 },
      );
    }
    if (result.status === "error") {
      return NextResponse.json(
        { success: false, error: RESEARCH_ERROR },
        { status: 500 },
      );
    }

    const body = researchRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!body.success) {
      return NextResponse.json(
        { success: false, error: "Invalid research request." },
        { status: 400 },
      );
    }

    const { profile } = result;
    const insforge = await createInsforgeServer();

    const loaded = await getResearchJob(insforge, profile.id, body.data.jobId);
    if (loaded.status === "not_found") {
      return NextResponse.json(
        { success: false, error: "That job could not be found." },
        { status: 404 },
      );
    }
    if (loaded.status === "error") {
      return NextResponse.json(
        { success: false, error: RESEARCH_ERROR },
        { status: 500 },
      );
    }

    const { job } = loaded;
    const research = await researchCompany(insforge, {
      userId: profile.id,
      job,
      profile,
    });

    // The agent's error is for agent_logs; the user gets a fixed message. A
    // kept dossier says so, or the unchanged card reads as a re-run that did
    // nothing; missing credits say so, or "try again" sends them round in
    // circles.
    if (!research.success) {
      const failure = {
        kept_saved: { error: RESEARCH_KEPT_ERROR, status: 502 },
        ai_unavailable: { error: RESEARCH_AI_UNAVAILABLE_ERROR, status: 503 },
        failed: { error: RESEARCH_ERROR, status: 500 },
      }[research.reason];
      return NextResponse.json(
        { success: false, error: failure.error },
        { status: failure.status },
      );
    }

    after(() => trackCompanyResearched(profile.id, job.id, job.company));

    return NextResponse.json({ success: true, data: research.data });
  } catch (error) {
    console.error("[api/agent/research]", error);
    return NextResponse.json(
      { success: false, error: RESEARCH_ERROR },
      { status: 500 },
    );
  }
}
