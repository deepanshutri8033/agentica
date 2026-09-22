import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateAgentSession } from "@/lib/get-agent-composio-session";
import { composio } from "@/lib/composio";

const SLUG_MAP: Record<string, string> = {
  web_search: "tavily",
  search: "tavily",
  google_search: "serpapi",
  browser_base: "browserbase",
};

const NON_OAUTH_TOOLS = new Set(["web_search", "tavily", "browserbase", "exa"]);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
    }

    const body = await req.json();
    let { toolSlug, agentId, appName, tool } = body;

    // 1. Defensively extract toolSlug if passed as an object or under alternative keys
    let rawSlug = toolSlug || appName || tool;
    if (typeof rawSlug === "object" && rawSlug !== null) {
      rawSlug = rawSlug.slug || rawSlug.toolSlug || rawSlug.name || rawSlug.appName || "";
    }

    if (typeof rawSlug !== "string" || !rawSlug.trim()) {
      return NextResponse.json(
        { error: "Valid toolSlug string and agentId are required" },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const cleanSlug = rawSlug.toLowerCase().trim();

    if (NON_OAUTH_TOOLS.has(cleanSlug)) {
      return NextResponse.json(
        {
          error: `"${rawSlug}" uses an API key rather than OAuth popup login. Configure it directly under API Keys in your Composio project.`,
        },
        { status: 400 }
      );
    }

    const normalizedSlug = SLUG_MAP[cleanSlug] || cleanSlug;

    // 2. Fetch agent configuration
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

    // 3. Retrieve or create Composio session
    const session: any = await getOrCreateAgentSession(agentConfig as any, userEmail);

    let redirectUrl = "";

    // Method 1: Try session.authorize with safe string fallback
    if (session && typeof session.authorize === "function") {
      try {
        const res = await session.authorize(normalizedSlug);
        redirectUrl = res?.redirectUrl || res?.url || res?.data?.redirectUrl || "";
      } catch (e: any) {
        console.warn("session.authorize failed, falling back to direct initiate:", e?.message);
      }
    }

    // Method 2: Fallback to direct composio.connectedAccounts.initiate
    if (!redirectUrl) {
      try {
        const connection = await composio.connectedAccounts.initiate({
          entityId: userEmail,
          appName: normalizedSlug,
        });

        redirectUrl =
          (connection as any)?.redirectUrl ||
          (connection as any)?.url ||
          (connection as any)?.data?.redirectUrl ||
          "";
      } catch (e: any) {
        console.warn("composio.connectedAccounts.initiate fallback error:", e?.message);
      }
    }

    if (!redirectUrl) {
      return NextResponse.json(
        { error: `No authorization URL returned for ${normalizedSlug}. Please verify the integration is enabled in Composio.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ redirectUrl });
  } catch (error: any) {
    console.error("Tool connection error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate tool connection" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
    }

    const body = await req.json();
    let { toolSlug, agentId } = body;

    // Defensively handle toolSlug if sent as object
    if (typeof toolSlug === "object" && toolSlug !== null) {
      toolSlug = toolSlug.slug || toolSlug.toolSlug || toolSlug.name || "";
    }

    if (!toolSlug || !agentId) {
      return NextResponse.json(
        { error: "toolSlug and agentId are required" },
        { status: 400 }
      );
    }

    // 1. Fetch agent record
    const result = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.agentId, agentId));

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentConfig = result[0];
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ||
      agentConfig.userEmail ||
      userId;

    // 2. Retrieve session
    const session: any = await getOrCreateAgentSession(agentConfig as any, userEmail);

    if (!session) {
      return NextResponse.json(
        { error: "Failed to establish Composio session" },
        { status: 500 }
      );
    }

    // 3. Find target toolkit
    let rawToolkits: any = null;
    if (typeof session.toolkits === "function") {
      rawToolkits = await session.toolkits();
    }

    const toolkitList: any[] = Array.isArray(rawToolkits)
      ? rawToolkits
      : Array.isArray(rawToolkits?.items)
      ? rawToolkits.items
      : [];

    const targetSlug = String(toolSlug).toLowerCase().trim();
    const toolKit = toolkitList.find(
      (item: any) =>
        item.slug?.toLowerCase() === targetSlug ||
        item.name?.toLowerCase() === targetSlug
    );

    // Extract Account ID safely as a pure primitive string
    const rawAccount = toolKit?.connection?.connectedAccount;
    const accountId: string | null =
      typeof rawAccount === "string"
        ? rawAccount
        : typeof rawAccount?.id === "string"
        ? rawAccount.id
        : Array.isArray(toolKit?.connectedAccountIds) && toolKit.connectedAccountIds[0]
        ? String(toolKit.connectedAccountIds[0])
        : null;

    if (!accountId) {
      return NextResponse.json(
        { error: "Active connection not found for this tool" },
        { status: 404 }
      );
    }

    // 4. Delete the connection
    let deleted = false;

    if (typeof session.deleteConnectedAccount === "function") {
      try {
        await session.deleteConnectedAccount(accountId);
        deleted = true;
      } catch (e: any) {
        console.warn("session.deleteConnectedAccount failed:", e?.message);
      }
    }

    if (!deleted) {
      const resV1 = await fetch(
        `https://backend.composio.dev/api/v1/connectedAccounts/${accountId}`,
        {
          method: "DELETE",
          headers: {
            "x-api-key": process.env.COMPOSIO_API_KEY || "",
            "Content-Type": "application/json",
          },
        }
      );

      if (!resV1.ok) {
        await fetch(
          `https://backend.composio.dev/api/v3.1/connected_accounts/${accountId}`,
          {
            method: "DELETE",
            headers: {
              "x-api-key": process.env.COMPOSIO_API_KEY || "",
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to disconnect tool:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to disconnect tool" },
      { status: 500 }
    );
  }
}