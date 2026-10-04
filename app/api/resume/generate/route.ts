import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { writeResumeContent } from "@/agent/resume-writer";
import { renderResumePdf } from "@/components/pdf/ResumeDocument";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getCurrentProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-completion";
import { resumeRoles } from "@/lib/resume-generation";
import {
  RESUME_GENERATION_ERROR,
  RESUME_MIME_TYPE,
  RESUME_NO_ROLES_ERROR,
  SESSION_EXPIRED_ERROR,
  profileIncompleteError,
} from "@/lib/utils";

/**
 * Builds a resume PDF from the caller's own saved profile and puts it in
 * storage at the key their profile already points at.
 *
 * Unlike the extract route this one *does* write — but only to the caller's own
 * row, and only the `resume_pdf_url` key it derives from the session. It takes
 * no body for the same reason: everything it needs is already on the row.
 *
 * The write replaces whatever resume was there, uploaded or generated. That is
 * the intended behaviour (`build-plan.md` 08) and the button warns before it
 * happens.
 */
export async function POST() {
  try {
    // Authenticate first: everything below costs either a GPT-4o call or a
    // storage write.
    const result = await getCurrentProfile();

    if (result.status === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: SESSION_EXPIRED_ERROR },
        { status: 401 },
      );
    }
    if (result.status === "error") {
      return NextResponse.json(
        { success: false, error: RESUME_GENERATION_ERROR },
        { status: 500 },
      );
    }

    const { profile } = result;

    // Before the model call, not after. An incomplete profile would spend a
    // GPT-4o call producing a resume with nothing on it. The same ten fields
    // the completion ring and the attention banner use, so the labels this
    // hands back are the ones already on screen.
    const completion = getProfileCompletion(profile);
    if (!completion.isComplete) {
      return NextResponse.json(
        {
          success: false,
          error: profileIncompleteError(completion.missingFields),
        },
        { status: 422 },
      );
    }

    // The completion check counts work_experience entries; it cannot see that
    // they are blank. `workExperienceSchema` allows every field to be "", so a
    // saved-but-unfilled role passes the gate above and would produce a resume
    // with no experience section at all.
    if (resumeRoles(profile).length === 0) {
      return NextResponse.json(
        { success: false, error: RESUME_NO_ROLES_ERROR },
        { status: 422 },
      );
    }

    const written = await writeResumeContent(profile);
    if (!written.success) {
      return NextResponse.json(
        { success: false, error: written.error },
        { status: 502 },
      );
    }

    const buffer = await renderResumePdf(profile, written.data);

    // `upload` takes a File | Blob and has no options argument — the installed
    // SDK's storage surface is documented in `library-docs.md`. The Buffer is
    // wrapped in a Uint8Array because a Node Buffer is not a BlobPart.
    const file = new File([new Uint8Array(buffer)], "resume.pdf", {
      type: RESUME_MIME_TYPE,
    });

    // Derived from the session, never from the client — the same rule that
    // governs `uploadResume`, and the only thing keeping one user out of
    // another's resume.
    const key = `${profile.id}/resume.pdf`;

    const insforge = await createInsforgeServer();
    const { error: uploadError } = await insforge.storage
      .from("resumes")
      .upload(key, file);

    if (uploadError) {
      console.error("[api/resume/generate] upload", uploadError);
      return NextResponse.json(
        { success: false, error: RESUME_GENERATION_ERROR },
        { status: 500 },
      );
    }

    // Written even when the key is unchanged: this is also the path that sets
    // it for the first time, for a complete profile that never uploaded a PDF.
    const { error: writeError } = await insforge.database
      .from("profiles")
      .update({ resume_pdf_url: key })
      .eq("id", profile.id)
      .select("id")
      .single();

    if (writeError) {
      console.error("[api/resume/generate] write", writeError);
      return NextResponse.json(
        { success: false, error: RESUME_GENERATION_ERROR },
        { status: 500 },
      );
    }

    revalidatePath("/profile");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/resume/generate]", error);
    return NextResponse.json(
      { success: false, error: RESUME_GENERATION_ERROR },
      { status: 500 },
    );
  }
}
