"use client";

import { useState } from "react";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import {
  mergeExtractedProfile,
  type ExtractedProfile,
} from "@/lib/resume-extraction";
import type { Profile } from "@/types";

type Props = {
  profile: Profile;
};

/**
 * Owns the one thing the resume card and the profile form have to share: what
 * an extraction found.
 *
 * The form's inputs are uncontrolled (`defaultValue` throughout), so the way to
 * put new values into them is to hand React a different component — hence the
 * key. Each extraction bumps it, the form remounts, and every field reads its
 * default from the merged profile. That keeps the five input components free of
 * the value/onChange plumbing controlling them would otherwise require.
 *
 * The merge is derived rather than stored, so a save that revalidates the page
 * is merged against the row that came back, not against the one this component
 * first rendered with.
 */
export function ProfileWorkspace({ profile }: Props) {
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);
  const [version, setVersion] = useState(0);

  // Answers how many fields changed so the button can say so. The merge is run
  // here rather than in the button because this component owns the profile the
  // extraction merges into.
  const handleExtracted = (values: ExtractedProfile): number => {
    setExtracted(values);
    setVersion((current) => current + 1);
    return mergeExtractedProfile(profile, values).changed;
  };

  return (
    <>
      <ResumeUpload
        resumeKey={profile.resume_pdf_url}
        onExtracted={handleExtracted}
      />
      <ProfileForm
        key={version}
        profile={
          extracted ? mergeExtractedProfile(profile, extracted).profile : profile
        }
      />
    </>
  );
}
