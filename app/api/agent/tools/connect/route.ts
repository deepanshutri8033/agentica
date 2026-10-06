import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { composio } from "@/lib/composio";
import { getUserConnectedAccounts, normalizeToolkitSlug } from "@/lib/composio-connected-accounts";

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

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;

    if (agentId) {
      const agentRecords = await db
        .select({ agentId: AgentConfig.agentId })
        .from(AgentConfig)
        .where(
          and(
            eq(AgentConfig.agentId, agentId),
            eq(AgentConfig.userEmail, userEmail)
          )
        )
        .limit(1);

      if (!agentRecords.length) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const authConfigs = await composio.authConfigs.list({
      toolkit: normalizedSlug,
    });
    const authConfigId = authConfigs.items[0]?.id;

    if (!authConfigId) {
      return NextResponse.json(
        {
          error: `No authentication configuration found for ${normalizedSlug}. Please enable or configure this integration in Composio.`,
        },
        { status: 400 }
      );
    }

    const connection = await composio.connectedAccounts.link(
      userEmail,
      authConfigId,
      { allowMultiple: true }
    );
    const redirectUrl = connection.redirectUrl;

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

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;

    if (agentId) {
      const agentRecords = await db
        .select({ agentId: AgentConfig.agentId })
        .from(AgentConfig)
        .where(
          and(
            eq(AgentConfig.agentId, agentId),
            eq(AgentConfig.userEmail, userEmail)
          )
        )
        .limit(1);

      if (!agentRecords.length) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const normalizedSlug = normalizeToolkitSlug(String(toolSlug));
    const accounts = await getUserConnectedAccounts(userEmail, normalizedSlug);

    await Promise.all(
      accounts.map((account) => composio.connectedAccounts.delete(account.id))
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to disconnect tool:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to disconnect tool" },
      { status: 500 }
    );
  }
}