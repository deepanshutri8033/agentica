import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { buildAgent } from "./build-agent";
import { run } from "@openai/agents";

export async function executeAgent({
  agentConfig,
  userEmail,
  input,
}: {
  agentConfig: CreatedAgentType;
  userEmail: string;
  input?: string | null;
}) {
  const rawStatus = (agentConfig?.status || "active").toString().toLowerCase().trim();

  if (rawStatus === "paused" || rawStatus === "inactive" || rawStatus === "disabled") {
    throw new Error("Agent is not active");
  }

  const agent = await buildAgent(agentConfig, userEmail);
  const taskPrompt = input?.trim() || agentConfig?.objective || agentConfig?.instructions || "";

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