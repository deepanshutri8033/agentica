import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { buildAgent } from "./build-agent";

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

  const result = await agent.run(taskPrompt);

  return {
    finalOutput: result?.finalOutput || "Agent finished processing.",
  };
}