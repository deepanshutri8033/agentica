import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agentRuns, AgentConfig } from "@/db/schema";
import { eq, and, lte, asc, inArray } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs";

// POST: Manually trigger dispatch of upcoming runs (Step 1 -> 2 -> 3 -> 5)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;
    const ownedAgents = await db
      .select({ agentId: AgentConfig.agentId })
      .from(AgentConfig)
      .where(eq(AgentConfig.userEmail, userEmail));
    const ownedAgentIds = ownedAgents.map((agent) => agent.agentId);
    if (ownedAgentIds.length === 0) {
      return NextResponse.json({
        message: "No scheduled runs found for your agents.",
        dispatchedCount: 0,
      });
    }

    // 1. Find this user's runs that are due now.
    const runs = await db
      .select()
      .from(agentRuns)
      .where(
        and(
          eq(agentRuns.status, "scheduled"),
          lte(agentRuns.scheduledFor, new Date()),
          inArray(agentRuns.agentId, ownedAgentIds)
        )
      )
      .orderBy(asc(agentRuns.scheduledFor))
      .limit(100);

    if (runs.length === 0) {
      return NextResponse.json({
        message: "No scheduled runs are due yet.",
        dispatchedCount: 0,
      });
    }

    const claimedRuns = [];
    const queuedAt = new Date();
    for (const run of runs) {
      const [claimedRun] = await db
        .update(agentRuns)
        .set({
          status: "queued",
          queuedAt,
          inngestEventId: `agent-run-${run.id}`,
          updatedAt: queuedAt,
        })
        .where(and(eq(agentRuns.id, run.id), eq(agentRuns.status, "scheduled")))
        .returning();
      if (claimedRun) claimedRuns.push(claimedRun);
    }

    if (claimedRuns.length === 0) {
      return NextResponse.json({
        message: "No scheduled runs are due yet.",
        dispatchedCount: 0,
      });
    }

    // 2. Send claimed runs to the Inngest event queue.
    const events = claimedRuns.map((run) => ({
      name: "agent/run.scheduled" as const,
      data: {
        runId: run.id,
        agentId: run.agentId,
        userEmail: run.userEmail,
        input: run.input,
        scheduledFor: run.scheduledFor.toISOString(),
        ts: run.scheduledFor.toISOString(),
      },
      id: `agent-run-${run.id}`,
    }));

    let eventResult;
    try {
      eventResult = await inngest.send(events);
    } catch (error) {
      await Promise.all(
        claimedRuns.map((run) =>
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

    return NextResponse.json({
      message: `Successfully dispatched ${claimedRuns.length} due run(s) to Inngest queue.`,
      dispatchedCount: claimedRuns.length,
      eventIds: eventResult.ids,
    });
  } catch (error: any) {
    console.error("Dispatch upcoming runs error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
