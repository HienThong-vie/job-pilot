import type { InsForgeClient } from "@insforge/sdk";

export type AgentLogLevel = "info" | "success" | "warning" | "error";

type AgentLogEntry = {
  userId: string;
  runId: string | null;
  level: AgentLogLevel;
  message: string;
  jobId?: string | null;
};

/**
 * Best-effort by design: a run that found and saved jobs must not be reported
 * as failed because its log line could not be written. A write failure goes to
 * the server console instead.
 */
export async function logAgent(
  insforge: InsForgeClient,
  entry: AgentLogEntry,
): Promise<void> {
  try {
    const { error } = await insforge.database.from("agent_logs").insert([
      {
        user_id: entry.userId,
        run_id: entry.runId,
        level: entry.level,
        message: entry.message,
        job_id: entry.jobId ?? null,
      },
    ]);

    if (error) console.error("[agent/agent-logs] insert", error);
  } catch (error) {
    console.error("[agent/agent-logs] logAgent", error);
  }
}
