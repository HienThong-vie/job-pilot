import { createPostHogServer } from "@/lib/posthog-server";

type SignInUser = {
  id: string;
  email: string;
  profile: { name?: string } | null;
};

export async function trackServerSignIn(
  user: SignInUser,
  provider: string | undefined,
): Promise<void> {
  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    posthog.identify({
      distinctId: user.id,
      properties: {
        email: user.email,
        name: user.profile?.name,
      },
    });

    posthog.capture({
      distinctId: user.id,
      event: "signed_in",
      properties: {
        userId: user.id,
        method: "oauth",
        provider,
      },
    });

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackServerSignIn", error);
  }
}

export async function trackProfileCompleted(userId: string): Promise<void> {
  try {
    const posthog = createPostHogServer();
    if (!posthog) return;

    posthog.capture({
      distinctId: userId,
      event: "profile_completed",
      properties: { userId },
    });

    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/analytics] trackProfileCompleted", error);
  }
}
