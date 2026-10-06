import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agentRuns, AgentConfig } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

// GET: Fetch runs for an agent or all runs for the user (auto-syncs active agents)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    // Auto-sync: ensure all active AgentConfig records have at least one scheduled run in agentRuns
    const activeAgents = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.status, "active"));

    for (const agent of activeAgents) {
      const existingRuns = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.agentId, agent.agentId))
        .limit(1);

      if (existingRuns.length === 0) {
        // Create initial scheduled run for this active agent
        const scheduledTime = new Date(Date.now() + 10 * 60 * 1000); // scheduled 10 mins from now
        await db.insert(agentRuns).values({
          agentId: agent.agentId,
          userEmail: agent.userEmail,
          status: "scheduled",
          scheduledFor: scheduledTime,
          input: agent.objective || agent.instructions,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    let runs;
    if (agentId) {
      runs = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.agentId, agentId))
        .orderBy(desc(agentRuns.scheduledFor))
        .limit(50);
    } else {
      runs = await db
        .select()
        .from(agentRuns)
        .orderBy(desc(agentRuns.scheduledFor))
        .limit(50);
    }

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("Failed to fetch agent runs:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Schedule a new AgentRun in PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, scheduledFor, input } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const agentConfigs = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.agentId, agentId))
      .limit(1);

    if (agentConfigs.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || agentConfigs[0].userEmail;

    const runDate = scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 5 * 60 * 1000);

    const [newRun] = await db
      .insert(agentRuns)
      .values({
        agentId,
        userEmail,
        status: "scheduled",
        scheduledFor: runDate,
        input: input || agentConfigs[0].objective,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ message: "Agent run scheduled successfully", run: newRun });
  } catch (error: any) {
    console.error("Failed to schedule agent run:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
