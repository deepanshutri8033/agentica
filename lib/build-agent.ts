import { CreatedAgentType } from "@/components/custom/agents/createAgent";
import { getOrCreateAgentSession } from "./get-agent-composio-session";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_KEY || "",
});

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

  const systemInstruction = `
You are ${sanitizedConfig.name}.
Description: ${sanitizedConfig.description || "General assistant"}
Objective: ${sanitizedConfig.objective || sanitizedConfig.instructions || ""}

Rules:
- Actively assist the user with insightful, relevant, and grounded answers.
- Use connected tools whenever external live data or platform actions are requested.
${sanitizedConfig.outputFormat ? `Output Format: ${sanitizedConfig.outputFormat}` : ""}
`.trim();

  return {
    session,
    systemInstruction,
    agentConfig: sanitizedConfig,
    async run(userInput: string) {
      const prompt = userInput?.trim() || sanitizedConfig.objective || "Hello";

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            systemInstruction,
          },
        });

        if (response?.text) {
          return { finalOutput: response.text };
        }
      } catch (err: any) {
        console.error("Gemini API error:", err?.message);
        return {
          finalOutput: `Error generating response with Gemini: ${err?.message}`,
        };
      }

      return {
        finalOutput: "No response generated from the agent.",
      };
    },
  };
}