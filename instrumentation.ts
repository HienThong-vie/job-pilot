/**
 * Runs once when a server instance starts.
 *
 * Starts uploading Stagehand's browser extension to Browserbase, so the first
 * Research Company press does not wait 25 to 45 seconds for it — see
 * `prepareStagehandExtension` in `lib/browserbase.ts`. Not awaited: `register`
 * must finish before the server takes requests, and nothing else needs it.
 * Node.js runtime only — the upload reads the zip from disk.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { prepareStagehandExtension } = await import("@/lib/browserbase");
    // A failure is logged and forgotten inside; the first research retries it.
    prepareStagehandExtension()?.catch(() => undefined);
  } catch (error) {
    console.error("[instrumentation] register", error);
  }
}
