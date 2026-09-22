import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { executeAgent } from "@/lib/execute-agent";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, input } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch agent configuration from PostgreSQL
    const agentRecords = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.agentId, agentId));

    if (!agentRecords || agentRecords.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = agentRecords[0];
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || agent.userEmail || userId;

    // 2. Execute agent
    const result = await executeAgent({
      agentConfig: agent as any,
      userEmail,
      input,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}