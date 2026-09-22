import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateAgentSession } from "@/lib/get-agent-composio-session";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId parameter is required" },
        { status: 400 }
      );
    }

    // 1. Fetch agent configuration
    const agentRecords = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.agentId, agentId));

    if (!agentRecords || agentRecords.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentConfig = agentRecords[0];
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ||
      agentConfig.userEmail ||
      userId;

    // 2. Retrieve session
    const session: any = await getOrCreateAgentSession(
      agentConfig as any,
      userEmail
    );

    if (!session) {
      return NextResponse.json(
        { error: "Failed to establish Composio session" },
        { status: 500 }
      );
    }

    // 3. Extract toolkits list
    let toolkits: any[] = [];
    if (typeof session.toolkits === "function") {
      const res = await session.toolkits();
      toolkits = Array.isArray(res) ? res : res?.items || [];
    }

    return NextResponse.json({ toolkits });
  } catch (error: any) {
    console.error("Failed to fetch agent tools:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch agent tools" },
      { status: 500 }
    );
  }
}