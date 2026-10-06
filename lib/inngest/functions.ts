import { inngest } from "./client";
import { db } from "@/db";
import { agentRuns, AgentConfig } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import { calculateNextOccurrence } from "./schedule-utils";
import { executeAgent } from "@/lib/execute-agent";

// =========================================================================
// FUNCTION 1: Dispatch Upcoming Agent Runs (Cron Job)
// Diagram Steps 1, 2, 3, 5
// =========================================================================
export const dispatchUpcomingRuns = (inngest as any).createFunction(
  {
    id: "dispatch-upcoming-agent-runs",
    name: "Groovi AI — Dispatch Upcoming Agent Runs",
    retries: 3,
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }: { step: any }) => {
    // Step 2: Find Upcoming Runs in PostgreSQL
    const upcomingRuns = await step.run("find-upcoming-runs", async () => {
      const windowMinutes = 60;
      const targetTime = new Date(Date.now() + windowMinutes * 60 * 1000);

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

      return runs.map((r) => ({
        id: r.id,
        agentId: r.agentId,
        userEmail: r.userEmail,
        input: r.input,
        scheduledFor: r.scheduledFor.toISOString(),
      }));
    });

    if (!upcomingRuns || upcomingRuns.length === 0) {
      return { message: "No upcoming agent runs found due within 60 minutes." };
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

      const response = await inngest.send(events);
      return { ids: response.ids, count: events.length };
    });

    // Step 5: Finalize Current Runs in PostgreSQL
    await step.run("finalize-current-runs", async () => {
      const runIdsToFinalize = upcomingRuns.map((r: any) => r.id);
      if (runIdsToFinalize.length === 0) return;

      const now = new Date();

      for (let i = 0; i < upcomingRuns.length; i++) {
        const run = upcomingRuns[i];
        const eventId = sendResult.ids[i] || `evt_${run.id}`;

        await db
          .update(agentRuns)
          .set({
            status: "queued",
            queuedAt: now,
            inngestEventId: eventId,
            updatedAt: now,
          })
          .where(
            and(
              eq(agentRuns.id, run.id),
              eq(agentRuns.status, "scheduled")
            )
          );
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
      const nextRunDate = calculateNextOccurrence(new Date(scheduledFor), schedule);

      if (nextRunDate) {
        const existingNextRun = await db
          .select()
          .from(agentRuns)
          .where(
            and(
              eq(agentRuns.agentId, agentId),
              eq(agentRuns.status, "scheduled"),
              eq(agentRuns.scheduledFor, nextRunDate)
            )
          )
          .limit(1);

        if (existingNextRun.length === 0) {
          await db.insert(agentRuns).values({
            agentId: agentId,
            userEmail: userEmail || agentConfig.userEmail,
            status: "scheduled",
            scheduledFor: nextRunDate,
            input: input || agentConfig.objective,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });

    // Step 8: Final execution of Current Agent Run
    const runResult = await step.run("execute-agent-task", async () => {
      await db
        .update(agentRuns)
        .set({
          status: "running",
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentRuns.id, runId));

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

        throw new Error(`Agent execution failed: ${errorMsg}`);
      }
    });

    return {
      runId,
      status: "completed",
      result: runResult,
    };
  }
);
