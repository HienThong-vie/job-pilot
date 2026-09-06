import { PostHog } from "posthog-node";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function createPostHogServer(): PostHog | null {
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
      );
    }
    return null;
  }

  // No enableExceptionAutocapture here: this client is created per request and
  // shut down immediately, but posthog-node's shutdown never removes the
  // process-level uncaughtException / unhandledRejection listeners it installs.
  // Server exception capture would need a singleton client, not this one.
  return new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
}
