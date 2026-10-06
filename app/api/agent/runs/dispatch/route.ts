import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agentRuns } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs";

// POST: Manually trigger dispatch of upcoming runs (Step 1 -> 2 -> 3 -> 5)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const windowMinutes = 60;
    const targetTime = new Date(Date.now() + windowMinutes * 60 * 1000);

    // 1. Find upcoming runs due within 60 minutes
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

    if (runs.length === 0) {
      return NextResponse.json({
        message: "No scheduled runs due within the next hour found.",
        dispatchedCount: 0,
      });
    }

    // 2. Send events to Inngest Event Queue (Step 3)
    const events = runs.map((run) => ({
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

    const eventResult = await inngest.send(events);
    const now = new Date();

    // 3. Finalize current runs in PostgreSQL (Step 5: scheduled -> queued)
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const inngestEventId = eventResult.ids[i] || `evt_${run.id}`;

      await db
        .update(agentRuns)
        .set({
          status: "queued",
          queuedAt: now,
          inngestEventId,
          updatedAt: now,
        })
        .where(
          and(
            eq(agentRuns.id, run.id),
            eq(agentRuns.status, "scheduled") // Guard against overwriting cancelled runs
          )
        );
    }

    return NextResponse.json({
      message: `Successfully dispatched ${runs.length} upcoming run(s) to Inngest queue.`,
      dispatchedCount: runs.length,
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
