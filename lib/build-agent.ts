import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { getOrCreateAgentSession } from "./get-agent-composio-session";
import { Agent } from "@openai/agents";
import { browserbaseResearchTool } from "./browserbase-tool";

export async function buildAgent(
  agentConfig: CreatedAgentType,
  userEmail: string
) {
  // 1. Sanitize tool entries to pure strings
  const sanitizedTools = Array.isArray(agentConfig?.tools)
    ? agentConfig.tools
        .map((t: any) => {
          if (typeof t === "string") return t.toLowerCase().trim();
          if (typeof t === "object" && t !== null) {
            return (t.slug || t.toolSlug || t.name || "").toLowerCase().trim();
          }
          return "";
        })
        .filter(Boolean)
    : [];

  const sanitizedConfig = {
    ...agentConfig,
    tools: sanitizedTools,
  };

  const session: any = await getOrCreateAgentSession(
    sanitizedConfig as any,
    userEmail
  );

  let composioTools: any[] = [];
  try {
    if (typeof session?.getTools === "function") {
      composioTools = await session.getTools();
    }
  } catch (err: any) {
    console.warn("Could not retrieve Composio tools:", err?.message);
  }

  const instructions = `
Use only the available tools when needed.
Do not claim that an action succeeded unless the tool result confirms it.
Ask for confirmation before destructive or high-risk actions.
`.trim();

  return new Agent({
    name: agentConfig.name,
    model: process.env.OPENAI_MODEL,
    instructions,
    tools: [...composioTools, browserbaseResearchTool],
  });
}