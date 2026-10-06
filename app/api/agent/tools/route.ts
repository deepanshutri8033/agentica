import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateAgentSession } from "@/lib/get-agent-composio-session";
import { getUserConnectedAccounts, normalizeToolkitSlug } from "@/lib/composio-connected-accounts";

// Normalize slug for comparison
function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[\s_-]/g, "");
}

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
      .where(eq(AgentConfig.agentId, agentId))
      .limit(1);

    if (!agentRecords || agentRecords.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentConfig = agentRecords[0];
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ||
      agentConfig.userEmail ||
      `user_${userId}@app.com`;

    // 2. Retrieve Composio session to get toolkit list
    const session: any = await getOrCreateAgentSession(
      agentConfig as any,
      userEmail
    );

    let toolkits: any[] = [];

    if (!session) {
      // Build basic toolkit list from agent config tools
      const rawTools = (agentConfig.tools as any[]) || [];
      toolkits = rawTools.map((t: any) => ({
        slug: typeof t === "string" ? t : t?.slug || t?.name || "",
        name: typeof t === "string" ? t : t?.name || t?.slug || "",
        connected: false,
      }));
    } else {
      if (typeof session.toolkits === "function") {
        const res = await session.toolkits();
        toolkits = Array.isArray(res) ? res : res?.items || res?.data || [];
      } else if (typeof session.getToolkits === "function") {
        const res = await session.getToolkits();
        toolkits = Array.isArray(res) ? res : res?.items || res?.data || [];
      } else if (Array.isArray(session.toolkits)) {
        toolkits = session.toolkits;
      } else if (Array.isArray(session.tools)) {
        toolkits = session.tools;
      }
    }

    const connectedAccounts = await getUserConnectedAccounts(userEmail);
    const accountBySlug = new Map(
      connectedAccounts.map((account) => [
        normalizeToolkitSlug(account.toolkit.slug),
        account,
      ])
    );

    // 4. Enrich each toolkit with connected status
    const enrichedToolkits = toolkits.map((tool: any) => {
      const slug = typeof tool === "string" ? tool : tool?.slug || tool?.name || "";
      const account = accountBySlug.get(normalizeToolkitSlug(slug));
      const isConnected = Boolean(account);
      return {
        ...(typeof tool === "object" ? tool : {}),
        slug,
        name: tool?.name || slug,
        connected: isConnected,
        connectedAccountId: account?.id,
        connection: isConnected
          ? { status: "ACTIVE", connectedAccount: account?.id }
          : { status: "NOT_CONNECTED" },
      };
    });

    const sessionId = session?.sessionId || session?.id || null;

    return NextResponse.json(
      { success: true, toolkits: enrichedToolkits, tools: enrichedToolkits, sessionId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Failed to fetch agent tools:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Unable to load agent tool status right now." },
      { status: 502 }
    );
  }
}