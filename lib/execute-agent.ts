import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { buildAgent } from "./build-agent";
import { run } from "@openai/agents";

export type AgentChatTurn = {
  role: "user" | "agent";
  content: string;
};

export async function executeAgent({
  agentConfig,
  userEmail,
  input,
  history = [],
}: {
  agentConfig: CreatedAgentType;
  userEmail: string;
  input?: string | null;
  history?: AgentChatTurn[];
}) {
  const rawStatus = (agentConfig?.status || "active").toString().toLowerCase().trim();

  if (rawStatus === "paused" || rawStatus === "inactive" || rawStatus === "disabled") {
    throw new Error("Agent is not active");
  }

  const agent = await buildAgent(agentConfig, userEmail);
  const conversation = history
    .map(({ role, content }) => `${role === "user" ? "User" : "Agent"}: ${content}`)
    .join("\n\n");
  const currentMessage =
    input?.trim() || agentConfig?.objective || agentConfig?.instructions || "";
  const taskPrompt = [
    conversation ? `Conversation so far:\n${conversation}` : "",
    `Current user message:\n${currentMessage}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Call runner function from @openai/agents SDK
  const result: any = await run(agent, taskPrompt);

  return {
    finalOutput:
      result?.finalOutput ||
      result?.output ||
      (typeof result === "string" ? result : JSON.stringify(result)) ||
      "Agent finished processing.",
  };
}