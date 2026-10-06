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

  const localOnlyToolkits = new Set([
    "browserbase",
    "browser_base",
    "browser",
  ]);
  const expectsComposioTools = sanitizedTools.some(
    (tool) => !localOnlyToolkits.has(tool)
  );
  if (expectsComposioTools && !session) {
    throw new Error(
      "This agent has Composio integrations configured, but its tool session could not be loaded. Check the Composio API key and reconnect the integrations."
    );
  }

  let composioTools: any[] = [];
  if (typeof session?.getTools === "function") {
    composioTools = await session.getTools();
  } else if (expectsComposioTools) {
    throw new Error(
      "This agent's Composio session does not expose its tools. Reconnect the integrations and try again."
    );
  }

  if (expectsComposioTools && composioTools.length === 0) {
    throw new Error(
      "No Composio tools were returned for this agent. Confirm its integrations are connected and enabled."
    );
  }

  const taskContext = [
    ["Agent name", agentConfig.name],
    ["Description", agentConfig.description],
    ["Saved objective", agentConfig.objective],
    ["Saved instructions", agentConfig.instructions],
    [
      "Skills",
      Array.isArray(agentConfig.skills) ? agentConfig.skills.join(", ") : "",
    ],
    ["Output format", agentConfig.outputFormat],
    ["Configured integrations", sanitizedTools.join(", ")],
  ]
    .map(([label, value]) => {
      const text = typeof value === "string" ? value.trim() : "";
      return text ? `${label}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");

  const instructions = `
You are a persistent assistant for the agent task described below. Keep this saved task context in mind for every chat turn. Answer follow-up questions in the context of that task, and carry out requests that advance it.

<saved_agent_task>
${taskContext || "No saved task details are available."}
</saved_agent_task>

When a user asks about information in a connected account, use the relevant available Composio tool to retrieve it. This includes Gmail messages and GitHub repositories, issues, pull requests, or activity when those tools are available. Do not claim access to an account or data unless the corresponding tool is available and its result confirms it. Be clear about the scope and freshness of retrieved information.

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