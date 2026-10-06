import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agentRuns, AgentConfig } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

// GET: Fetch runs belonging to the signed-in user's agents.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;
    const ownedAgents = await db
      .select({ agentId: AgentConfig.agentId })
      .from(AgentConfig)
      .where(eq(AgentConfig.userEmail, userEmail));
    const ownedAgentIds = ownedAgents.map((agent) => agent.agentId);

    if (agentId && !ownedAgentIds.includes(agentId)) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (ownedAgentIds.length === 0) {
      return NextResponse.json({ runs: [] });
    }

    const filters = agentId
      ? and(eq(agentRuns.agentId, agentId), inArray(agentRuns.agentId, ownedAgentIds))
      : inArray(agentRuns.agentId, ownedAgentIds);
    if (agentId) {
      const runs = await db
        .select()
        .from(agentRuns)
        .where(filters)
        .orderBy(desc(agentRuns.scheduledFor))
        .limit(50);

      return NextResponse.json({ runs });
    }

    const runs = await db
        .select()
        .from(agentRuns)
        .where(filters)
        .orderBy(desc(agentRuns.scheduledFor))
        .limit(50);

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

    if (typeof agentId !== "string" || !agentId.trim()) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;
    const agentConfigs = await db
      .select()
      .from(AgentConfig)
      .where(
        and(
          eq(AgentConfig.agentId, agentId),
          eq(AgentConfig.userEmail, userEmail)
        )
      )
      .limit(1);

    if (agentConfigs.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const runDate = scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 5 * 60 * 1000);
    if (!Number.isFinite(runDate.getTime()) || runDate <= new Date()) {
      return NextResponse.json(
        { error: "scheduledFor must be a valid future date and time." },
        { status: 400 }
      );
    }

    const [newRun] = await db
      .insert(agentRuns)
      .values({
        agentId,
        userEmail,
        status: "scheduled",
        scheduledFor: runDate,
        input:
          typeof input === "string" && input.trim()
            ? input.trim()
            : agentConfigs[0].objective || agentConfigs[0].instructions,
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
