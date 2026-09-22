import { groq } from "@/lib/groq";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";

export const runtime = "nodejs";

// Updated active Groq model list
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen-2.5-72b-instruct",
  "deepseek-r1-distill-llama-70b"
];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;

    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let completion = null;
    let lastError: any = null;

    for (const model of MODELS) {
      try {
        completion = await groq.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content:
                'You are an AI Agent builder assistant. Generate agent configuration details based on user intent. Respond ONLY in valid JSON matching this exact structure: {"name": "string", "description": "string", "instructions": "string", "suggestedTools": ["string"]}. Do not wrap response in markdown blocks.',
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1024,
        });

        if (completion?.choices[0]?.message?.content) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Groq model '${model}' failed: ${err?.message}`);
      }
    }

    let content = completion?.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: lastError?.message || "Failed to generate configuration with Groq models" },
        { status: 500 }
      );
    }

    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsedConfig = JSON.parse(content);
    const generatedAgentId = `agent_${Math.random().toString(36).substring(2, 11)}`;

    const newAgentRecord = {
      userEmail,
      agentId: generatedAgentId,
      name: parsedConfig.name || "Custom AI Agent",
      agentImage: "/default-agent.png",
      description: parsedConfig.description || prompt,
      instructions: parsedConfig.instructions || "",
      objective: prompt,
      tools: parsedConfig.suggestedTools || [],
      skills: [],
      schedule: { type: "manual" },
      outputFormat: "text",
      status: "active",
      createdAt: new Date().toISOString(),
      composioSessionId: "",
    };

    // Save newly configured agent to database
    await db.insert(AgentConfig).values(newAgentRecord as any);

    return NextResponse.json(
      {
        status: "ready",
        clarificationQuestions: [],
        config: parsedConfig,
        agent: newAgentRecord,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Groq Agent Configure API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}