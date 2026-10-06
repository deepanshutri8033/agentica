import { inngest } from "./client";
import { db } from "@/db";
import { agentRuns, AgentConfig } from "@/db/schema";
import { eq, and, lte, lt, asc, inArray, or } from "drizzle-orm";
import {
  calculateNextOccurrence,
  getNextScheduledOccurrence,
} from "./schedule-utils";
import { executeAgent } from "@/lib/execute-agent";
import { isGeminiQuotaError } from "@/lib/build-agent";

function isRetryableAgentExecutionError(error: any) {
  const status = error?.status ?? error?.statusCode ?? error?.error?.code;
  const code = error?.code ?? error?.cause?.code;
  return (
    [408, 429, 500, 502, 503, 504].includes(Number(status)) ||
    ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(code)
  );
}

// =========================================================================
// FUNCTION 1: Dispatch Upcoming Agent Runs (Cron Job)
// Diagram Steps 1, 2, 3, 5
// =========================================================================
export const dispatchUpcomingRuns = (inngest as any).createFunction(
  {
    id: "dispatch-upcoming-agent-runs",
    name: "Groovi AI — Dispatch Upcoming Agent Runs",
    retries: 3,
    triggers: [{ cron: "* * * * *" }],
  },
  async ({ step }: { step: any }) => {
    // Step 2: Find Upcoming Runs in PostgreSQL
    const upcomingRuns = await step.run("claim-due-runs", async () => {
      const targetTime = new Date();
      const staleQueueCutoff = new Date(targetTime.getTime() - 5 * 60_000);

      const runs = await db
        .select()
        .from(agentRuns)
        .where(
          and(
            lte(agentRuns.scheduledFor, targetTime),
            or(
              eq(agentRuns.status, "scheduled"),
              and(
                eq(agentRuns.status, "queued"),
                lt(agentRuns.queuedAt, staleQueueCutoff)
              )
            )
          )
        )
        .orderBy(asc(agentRuns.scheduledFor))
        .limit(100);

      const claimed = [];
      for (const run of runs) {
        const now = new Date();
        const statusGuard =
          run.status === "scheduled"
            ? eq(agentRuns.status, "scheduled")
            : and(
                eq(agentRuns.status, "queued"),
                lt(agentRuns.queuedAt, staleQueueCutoff)
              );
        const [claimedRun] = await db
          .update(agentRuns)
          .set({
            status: "queued",
            queuedAt: now,
            inngestEventId: `agent-run-${run.id}`,
            updatedAt: now,
          })
          .where(and(eq(agentRuns.id, run.id), statusGuard))
          .returning();

        if (claimedRun) {
          claimed.push({
            id: claimedRun.id,
            agentId: claimedRun.agentId,
            userEmail: claimedRun.userEmail,
            input: claimedRun.input,
            scheduledFor: claimedRun.scheduledFor.toISOString(),
          });
        }
      }
      return claimed;
    });

    if (!upcomingRuns || upcomingRuns.length === 0) {
      return { message: "No scheduled agent runs are due." };
    }

    // Step 3: Send Future Events to Inngest Event Queue
    const sendResult = await step.run("send-future-events", async () => {
      const events = upcomingRuns.map((run: any) => ({
        name: "agent/run.scheduled" as const,
        data: {
          runId: run.id,
          agentId: run.agentId,
          userEmail: run.userEmail,
          input: run.input,
          scheduledFor: run.scheduledFor,
          ts: run.scheduledFor,
        },
        id: `agent-run-${run.id}`,
      }));

      try {
        const response = await inngest.send(events);
        return { ids: response.ids, count: events.length };
      } catch (error) {
        await Promise.all(
          upcomingRuns.map((run: any) =>
            db
              .update(agentRuns)
              .set({
                status: "scheduled",
                queuedAt: null,
                inngestEventId: null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(agentRuns.id, run.id),
                  eq(agentRuns.status, "queued"),
                  eq(agentRuns.inngestEventId, `agent-run-${run.id}`)
                )
              )
          )
        );
        throw error;
      }
    });

    return {
      dispatchedCount: upcomingRuns.length,
      eventIds: sendResult.ids,
    };
  }
);

// =========================================================================
// FUNCTION 2: Execute Scheduled Agent Run Worker
// Diagram Steps 4, 6, 7, 8
// =========================================================================
export const executeScheduledAgentRun = (inngest as any).createFunction(
  {
    id: "execute-scheduled-agent-run",
    name: "Groovi AI — Execute Scheduled Agent Run Worker",
    retries: 3,
    triggers: [{ event: "agent/run.scheduled" }],
    onFailure: async ({
      event,
      error,
      step,
    }: {
      event: any;
      error: Error;
      step: any;
    }) => {
      const runId = event?.data?.event?.data?.runId;
      if (typeof runId !== "number") {
        console.error("Could not mark exhausted scheduled run failed: missing runId.");
        return;
      }

      await step.run("mark-run-failed-after-retries", async () => {
        await db
          .update(agentRuns)
          .set({
            status: "failed",
            error: error.message || "Agent execution failed after retries.",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(agentRuns.id, runId),
              inArray(agentRuns.status, ["queued", "running"])
            )
          );
      });
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { runId, agentId, userEmail, input, scheduledFor } = event.data;

    // Step 4: Durable Wait until scheduled time
    await step.sleepUntil(
      "wait-until-scheduled-time",
      new Date(scheduledFor)
    );

    // Step 6: Check Latest AgentConfig
    const configCheck = await step.run("check-latest-agent-config", async () => {
      const [runRecord] = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, runId))
        .limit(1);

      if (!runRecord || runRecord.status !== "queued") {
        return {
          active: false,
          reason: `Run is no longer queued (status: ${runRecord?.status || "missing"})`,
          config: null,
        };
      }

      const configs = await db
        .select()
        .from(AgentConfig)
        .where(eq(AgentConfig.agentId, agentId))
        .limit(1);

      if (configs.length === 0) {
        return { active: false, reason: "Agent configuration not found", config: null };
      }

      const agentConfig = configs[0];
      const rawStatus = (agentConfig.status || "active").toLowerCase().trim();
      const isActive = rawStatus === "active";

      return {
        active: isActive,
        reason: isActive ? "Agent active" : `Agent status is '${agentConfig.status}'`,
        config: agentConfig,
      };
    });

    if (!configCheck.active) {
      await step.run("mark-run-stopped", async () => {
        await db
          .update(agentRuns)
          .set({
            status: "cancelled",
            error: `Stopped execution: ${configCheck.reason}`,
            updatedAt: new Date(),
          })
          .where(eq(agentRuns.id, runId));
      });

      return { status: "stopped", reason: configCheck.reason };
    }

    const agentConfig = configCheck.config!;

    // Step 7: Check recurring schedule & Create Next Occurrence
    await step.run("create-next-occurrence", async () => {
      const schedule = agentConfig.schedule;
      const nextRunDate =
        schedule?.type?.toLowerCase() === "recurring"
          ? calculateNextOccurrence(new Date(scheduledFor), schedule)
          : null;
      const nextOccurrence =
        nextRunDate && nextRunDate <= new Date()
          ? getNextScheduledOccurrence(schedule, new Date())
          : nextRunDate;

      if (nextOccurrence) {
        const existingNextRun = await db
          .select()
          .from(agentRuns)
          .where(
            and(
              eq(agentRuns.agentId, agentId),
              eq(agentRuns.status, "scheduled"),
              eq(agentRuns.scheduledFor, nextOccurrence)
            )
          )
          .limit(1);

        if (existingNextRun.length === 0) {
          await db.insert(agentRuns).values({
            agentId: agentId,
            userEmail: userEmail || agentConfig.userEmail,
            status: "scheduled",
            scheduledFor: nextOccurrence,
            input: input || agentConfig.objective,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });

    const claimedRun = await step.run("claim-agent-run", async () => {
      const [claimedRun] = await db
        .update(agentRuns)
        .set({
          status: "running",
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agentRuns.id, runId),
            eq(agentRuns.status, "queued")
          )
        )
        .returning({ id: agentRuns.id });

      if (!claimedRun) {
        return false;
      }

      return true;
    });

    if (!claimedRun) {
      return {
        runId,
        status: "skipped",
        reason: "Run is no longer queued.",
      };
    }

    // Keep execution in its own durable step so retries reuse the successful claim.
    const runResult = await step.run("execute-agent-task", async () => {
      try {
        const effectiveUserEmail = userEmail || agentConfig.userEmail || "system@groovi-ai.com";
        const result = await executeAgent({
          agentConfig: agentConfig as any,
          userEmail: effectiveUserEmail,
          input: input || agentConfig.objective || agentConfig.instructions,
        });

        return { success: true, result };
      } catch (err: any) {
        const errorMsg = err?.message || "Failed to execute agent run";
        if (isGeminiQuotaError(err) || !isRetryableAgentExecutionError(err)) {
          return { success: false, error: errorMsg, retryable: false };
        }

        throw err instanceof Error ? err : new Error(errorMsg);
      }
    });

    await step.run("persist-agent-outcome", async () => {
      const finishedAt = new Date();
      await db
        .update(agentRuns)
        .set(
          runResult.success
            ? {
                status: "completed",
                completedAt: finishedAt,
                result: runResult.result,
                error: null,
                updatedAt: finishedAt,
              }
            : {
                status: "failed",
                completedAt: finishedAt,
                error: runResult.error,
                updatedAt: finishedAt,
              }
        )
        .where(
          and(
            eq(agentRuns.id, runId),
            inArray(agentRuns.status, ["queued", "running"])
          )
        );
    });

    return {
      runId,
      status: runResult.success ? "completed" : "failed",
      result: runResult,
    };
  }
);
