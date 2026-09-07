"use server";

import { revalidatePath } from "next/cache";

import { trackProfileCompleted } from "@/lib/analytics";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getProfileCompletion } from "@/lib/profile-completion";
import {
  firstIssueMessage,
  profileFormSchema,
  readProfileForm,
} from "@/lib/profile-form";
import {
  MAX_RESUME_BYTES,
  RESUME_EMPTY_ERROR,
  RESUME_MIME_TYPE,
  RESUME_MISSING_ERROR,
  RESUME_SIZE_ERROR,
  RESUME_TYPE_ERROR,
} from "@/lib/utils";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

export async function saveProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const insforge = await createInsforgeServer();
    const { data: session } = await insforge.auth.getCurrentUser();
    if (!session.user) {
      return { status: "error", message: SESSION_EXPIRED };
    }

    const parsed = profileFormSchema.safeParse(readProfileForm(formData));
    if (!parsed.success) {
      return { status: "error", message: firstIssueMessage(parsed.error) };
    }

    // Email and the previous completion state come from the row, never the
    // form — the email input is read-only in the UI but still submits, and a
    // client must not get to say what its own row already contains.
    const { data: current, error: readError } = await insforge.database
      .from("profiles")
      .select("email, profile_completed_at")
      .eq("id", session.user.id)
      .single();

    if (readError || !current) {
      console.error("[actions/profile] read", readError);
      return { status: "error", message: "Failed to save profile." };
    }

    const completion = getProfileCompletion({
      ...parsed.data,
      email: typeof current.email === "string" ? current.email : "",
    });

    // `is_complete` is the profile's current state and flips back to false when
    // a field is cleared; `profile_completed_at` is set once and never cleared,
    // so `profile_completed` fires the first time and only the first time.
    const firstCompletion =
      completion.isComplete && current.profile_completed_at == null;

    const { error: writeError } = await insforge.database
      .from("profiles")
      .update({
        ...parsed.data,
        // The column is `jsonb not null default '{}'` — an untouched Education
        // section writes the empty object, not null.
        education: parsed.data.education ?? {},
        is_complete: completion.isComplete,
        ...(firstCompletion
          ? { profile_completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", session.user.id)
      .select("id")
      .single();

    if (writeError) {
      console.error("[actions/profile] write", writeError);
      return { status: "error", message: "Failed to save profile." };
    }

    if (firstCompletion) {
      await trackProfileCompleted(session.user.id);
    }

    revalidatePath("/profile");

    return {
      status: "success",
      message: completion.isComplete
        ? "Profile saved. Everything we need is filled in."
        : "Profile saved.",
    };
  } catch (error) {
    console.error("[actions/profile] saveProfile", error);
    return { status: "error", message: "Failed to save profile." };
  }
}

export async function uploadResume(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    // Authenticate before looking at the payload at all. Harmless here, but
    // this is the shape features 07/08 copy, and there the work that follows
    // costs a GPT-4o call.
    const insforge = await createInsforgeServer();
    const { data: session } = await insforge.auth.getCurrentUser();
    if (!session.user) {
      return { status: "error", message: SESSION_EXPIRED };
    }

    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return { status: "error", message: RESUME_MISSING_ERROR };
    }
    if (file.size === 0) {
      return { status: "error", message: RESUME_EMPTY_ERROR };
    }
    if (file.type !== RESUME_MIME_TYPE) {
      return { status: "error", message: RESUME_TYPE_ERROR };
    }
    if (file.size > MAX_RESUME_BYTES) {
      return { status: "error", message: RESUME_SIZE_ERROR };
    }

    // Always derived from the session, never from the client — this is the
    // only thing keeping one user out of another's resume.
    const key = `${session.user.id}/resume.pdf`;

    const { error: uploadError } = await insforge.storage
      .from("resumes")
      .upload(key, file);

    if (uploadError) {
      console.error("[actions/profile] upload", uploadError);
      return { status: "error", message: "Failed to upload resume." };
    }

    const { error: writeError } = await insforge.database
      .from("profiles")
      .update({ resume_pdf_url: key })
      .eq("id", session.user.id)
      .select("id")
      .single();

    if (writeError) {
      console.error("[actions/profile] upload write", writeError);
      return { status: "error", message: "Failed to upload resume." };
    }

    revalidatePath("/profile");

    return { status: "success", message: `Uploaded ${file.name}.` };
  } catch (error) {
    console.error("[actions/profile] uploadResume", error);
    return { status: "error", message: "Failed to upload resume." };
  }
}
