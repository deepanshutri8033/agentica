import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { getOrCreateAgentSession } from "./get-agent-composio-session";
import { Agent, OpenAIProvider } from "@openai/agents";
import { allBrowserbaseTools } from "./browserbase-tool";

async function getAgentModel() {
  const provider =
    process.env.AGENT_MODEL_PROVIDER?.toLowerCase() ||
    (process.env.GEMINI_API_KEY ? "gemini" : "openai");

  if (provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "AGENT_MODEL_PROVIDER is set to gemini, but GEMINI_API_KEY is missing."
      );
    }

    const geminiProvider = new OpenAIProvider({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      useResponses: false,
    });

    return geminiProvider.getModel(
      process.env.GEMINI_AGENT_MODEL || "gemini-3.8-flash"
    );
  }

  if (provider !== "openai") {
    throw new Error(
      `Unsupported AGENT_MODEL_PROVIDER "${provider}". Use "openai" or "gemini".`
    );
  }

  return process.env.OPENAI_MODEL;
}

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
    model: await getAgentModel(),
    instructions,
    tools: [...composioTools, ...allBrowserbaseTools],
  });
}