import { NextResponse, type NextRequest } from "next/server";

import { createInsforgeServer } from "@/lib/insforge-server";
import { getCurrentProfile } from "@/lib/profile";

// Long enough to open the file, short enough that the credential-free URL is
// worthless if it leaks. A fresh one is minted on every click, so the link on
// the page never goes stale the way an embedded signed URL would.
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Redirect-only Route Handler (see code-standards.md): its whole job is to send
 * the browser at the file. The `resumes` bucket is private, so the object key
 * stored in `profiles.resume_pdf_url` is not fetchable on its own — the session
 * is checked here and exchanged for a short-lived signed URL.
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getCurrentProfile();

    if (result.status === "unauthenticated") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (result.status === "error" || !result.profile.resume_pdf_url) {
      return NextResponse.redirect(new URL("/profile?resume=missing", request.url));
    }

    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.storage
      .from("resumes")
      .createSignedUrl(result.profile.resume_pdf_url, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      console.error("[api/resume/view]", error);
      return NextResponse.redirect(
        new URL("/profile?resume=unavailable", request.url),
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error("[api/resume/view]", error);
    return NextResponse.redirect(
      new URL("/profile?resume=unavailable", request.url),
    );
  }
}
