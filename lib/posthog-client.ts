import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function initPostHog(): void {
  if (typeof window === "undefined") return;

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
      );
    }
    return;
  }

  posthog.init(key, {
    api_host: "/ingest",
    ui_host: host?.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
