import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { AgentConfigSystemPrompt } from "@/data/Prompt";
import { AgentConfigRespSchema } from "@/data/responseSchema";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db"; // Adjust this path if your db instance lives in @/configs/db or @/db/index
import { AgentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const user = await currentUser();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is Required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing Gemini API key configuration" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const contentPayload = AgentConfigSystemPrompt.replace(
      "{USER_PROMPT}",
      prompt
    );

    let response = null;
    let lastError: any = null;

    // Retry specifically for temporary 503 server busy spikes
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: contentPayload,
          config: {
            responseMimeType: "application/json",
            responseSchema: AgentConfigRespSchema,
          },
        });
        if (response) break;
      } catch (err: any) {
        lastError = err;
        if (err.status === 503 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to receive response from Gemini");
    }

    const aiOutput = JSON.parse(response.text ?? "{}");

    // If configuration is finalized, auto-save to Neon Postgres
    if (aiOutput.status === "ready" && aiOutput.config) {
      const agentId = crypto.randomUUID();
      const userEmail = user?.primaryEmailAddress?.emailAddress;

      const dbResult = await db
        .insert(AgentConfig)
        .values({
          ...aiOutput.config,
          agentImage: `https://api.dicebear.com/10.x/micah/svg?seed=${agentId}`,
          agentId: agentId,
          userEmail: userEmail,
        })
        .returning();

      return NextResponse.json({
        ...dbResult[0],
        status: "ready",
      });
    }

    return NextResponse.json(JSON.parse(response.text ?? "{}"));
  } catch (e: any) {
    console.error("Agent Configure API Error:", e);
    const status = e.status || 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? "Gemini servers are currently experiencing high demand. Please try again in a few seconds."
            : e.message || "Failed to generate configuration",
      },
      { status }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Normalize payload whether sent as { agentConfig: ... }, { data: ... }, or raw object
    const agentData =
      body.agentConfig || body.AgentConfig || body.data?.draftAgent || body.draftAgent || body;

    // Explicitly exclude non-updatable and timestamp string fields
    const {
      agentId,
      id,
      createdAt,
      updatedAt,
      userEmail,
      ...updateFields
    } = agentData;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required to update agent" },
        { status: 400 }
      );
    }

    const result = await db
      .update(AgentConfig)
      .set({
        ...updateFields,
      })
      .where(eq(AgentConfig.agentId, agentId))
      .returning();

    console.log("Updated agent successfully:", result[0]);

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Agent Update Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update agent" },
      { status: 500 }
    );
  }
}