import { inngest } from "./client";
import { db } from "@/db";
import { agentRuns, AgentConfig } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import {
  calculateNextOccurrence,
  getNextScheduledOccurrence,
} from "./schedule-utils";
import { executeAgent } from "@/lib/execute-agent";
import { isGeminiQuotaError } from "@/lib/build-agent";

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

      const runs = await db
        .select()
        .from(agentRuns)
        .where(
          and(
            eq(agentRuns.status, "scheduled"),
            lte(agentRuns.scheduledFor, targetTime)
          )
        )
        .orderBy(asc(agentRuns.scheduledFor))
        .limit(100);

      const claimed = [];
      for (const run of runs) {
        const now = new Date();
        const [claimedRun] = await db
          .update(agentRuns)
          .set({
            status: "queued",
            queuedAt: now,
            inngestEventId: `agent-run-${run.id}`,
            updatedAt: now,
          })
          .where(and(eq(agentRuns.id, run.id), eq(agentRuns.status, "scheduled")))
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

    // Step 8: Final execution of Current Agent Run
    const runResult = await step.run("execute-agent-task", async () => {
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
        return { success: false, skipped: true, reason: "Run is no longer queued." };
      }

      try {
        const effectiveUserEmail = userEmail || agentConfig.userEmail || "system@groovi-ai.com";
        const result = await executeAgent({
          agentConfig: agentConfig as any,
          userEmail: effectiveUserEmail,
          input: input || agentConfig.objective || agentConfig.instructions,
        });

        const completedAt = new Date();
        await db
          .update(agentRuns)
          .set({
            status: "completed",
            completedAt: completedAt,
            result: result,
            updatedAt: completedAt,
          })
          .where(eq(agentRuns.id, runId));

        return { success: true, result };
      } catch (err: any) {
        const errorMsg = err?.message || "Failed to execute agent run";
        const failedAt = new Date();

        await db
          .update(agentRuns)
          .set({
            status: "failed",
            error: errorMsg,
            completedAt: failedAt,
            updatedAt: failedAt,
          })
          .where(eq(agentRuns.id, runId));

        if (isGeminiQuotaError(err)) {
          return { success: false, error: errorMsg, retryable: false };
        }

        throw new Error(`Agent execution failed: ${errorMsg}`);
      }
    });

    return {
      runId,
      status: runResult.success ? "completed" : "failed",
      result: runResult,
    };
  }
);
