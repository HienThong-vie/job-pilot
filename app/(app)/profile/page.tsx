import { redirect } from "next/navigation";

import { ProfileAttentionBanner } from "@/components/profile/ProfileAttentionBanner";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import { getCurrentProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-completion";

export default async function ProfilePage() {
  const result = await getCurrentProfile();

  if (result.status === "unauthenticated") redirect("/login");
  // Only a genuine read failure reaches here — throwing hands it to the
  // segment's error boundary rather than pretending the session ended.
  if (result.status === "error") {
    throw new Error("Could not load profile");
  }

  const { profile } = result;
  const completion = getProfileCompletion(profile);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-9 px-4 py-9 sm:px-8">
      {!completion.isComplete && (
        <ProfileAttentionBanner completion={completion} />
      )}
      <ProfileWorkspace profile={profile} />
    </div>
  );
}
