import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { composio } from "./composio";

// Map aliases/UI labels to valid Composio toolkit slugs
const SLUG_MAP: Record<string, string> = {
  web_search: "tavily",
  search: "tavily",
  google_search: "serpapi",
  serp_search: "serpapi",
  serpapi_search: "serpapi",
  reddit_tool: "reddit",
};

// Slugs that Composio's Tool Router v2 session API cannot handle as toolkits
const UNSUPPORTED_TOOLKITS = new Set([
  "browserbase",
  "browser_base",
  "exa",
]);

export async function getOrCreateAgentSession(
  agentConfig: CreatedAgentType,
  userEmail: string
) {
  // 1. Extract, sanitize, map, and filter tool slugs
  const rawTools = agentConfig?.tools || [];
  const cleanToolSlugs: string[] = rawTools
    .map((t: any) => {
      let val = "";
      if (typeof t === "string") {
        val = t;
      } else if (typeof t === "object" && t !== null) {
        val = t.slug || t.toolSlug || t.name || "";
      }
      return typeof val === "string" ? val.toLowerCase().trim() : "";
    })
    .filter((slug: string) => Boolean(slug) && slug !== "[object object]")
    // Map web_search -> tavily, serp_search -> serpapi
    .map((slug: string) => SLUG_MAP[slug] || slug)
    // Strip out tools that crash Composio Tool Router v2
    .filter((slug: string) => !UNSUPPORTED_TOOLKITS.has(slug));

  console.log("[DEBUG COMPOSIO] Clean & verified tool slugs:", cleanToolSlugs);

  // 2. Re-use existing session if available
  if (agentConfig?.composioSessionId) {
    try {
      const existingSession = await composio.use(agentConfig.composioSessionId);
      if (existingSession) {
        return existingSession;
      }
    } catch (e: any) {
      console.warn("Cached session invalid, resetting in DB:", e?.message);
      if (agentConfig.agentId) {
        try {
          await db
            .update(AgentConfig)
            .set({ composioSessionId: null })
            .where(eq(AgentConfig.agentId, agentConfig.agentId));
        } catch (dbErr: any) {
          console.warn("Failed to clear cached session in DB:", dbErr?.message);
        }
      }
    }
  }

  // 3. Create fresh Composio session
  const session = await (composio.sessions.create as any)(userEmail, {
    toolkits: cleanToolSlugs,
  });

  const sessionId = session?.sessionId || (session as any)?.id;

  // 4. Persist newly created session ID into DB non-destructively
  if (agentConfig?.agentId && sessionId) {
    await saveComposioSessionId(agentConfig.agentId, sessionId);
  }

  return session;
}

const saveComposioSessionId = async (agentId: string, sessionId: string) => {
  try {
    const result = await db
      .update(AgentConfig)
      .set({ composioSessionId: sessionId })
      .where(eq(AgentConfig.agentId, agentId))
      .returning();

    return result[0];
  } catch (err: any) {
    console.warn(
      "Failed to persist Composio Session ID to DB (continuing anyway):",
      err?.message
    );
  }
};