import { NextResponse } from "next/server";

import { extractProfileFromResume } from "@/agent/resume-extractor";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getCurrentProfile } from "@/lib/profile";
import {
  RESUME_EXTRACTION_ERROR,
  RESUME_NOT_UPLOADED_ERROR,
  SESSION_EXPIRED_ERROR,
} from "@/lib/utils";

/**
 * Reads the caller's own resume and returns what GPT-4o found in it. Writes
 * nothing — `saveProfile` stays the only path into the profiles table, and the
 * user reviews the extraction before it gets there.
 */
export async function POST() {
  try {
    // Authenticate before doing anything else: the work below costs a GPT-4o
    // call, so an unauthenticated request must not reach it.
    const result = await getCurrentProfile();

    if (result.status === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: SESSION_EXPIRED_ERROR },
        { status: 401 },
      );
    }
    if (result.status === "error") {
      return NextResponse.json(
        { success: false, error: RESUME_EXTRACTION_ERROR },
        { status: 500 },
      );
    }

    // The key comes from the caller's own row, never from the request — which
    // is why this route takes no body at all.
    const resumeKey = result.profile.resume_pdf_url;
    if (!resumeKey) {
      return NextResponse.json(
        { success: false, error: RESUME_NOT_UPLOADED_ERROR },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();
    const extraction = await extractProfileFromResume(insforge, resumeKey);

    if (!extraction.success) {
      // A resume we could not read is the caller's file, not a server fault.
      return NextResponse.json(
        { success: false, error: extraction.error },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, data: extraction.data });
  } catch (error) {
    console.error("[api/resume/extract]", error);
    return NextResponse.json(
      { success: false, error: RESUME_EXTRACTION_ERROR },
      { status: 500 },
    );
  }
}
