import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { AgentConfigSystemPrompt } from "@/data/Prompt";
import { AgentConfigRespSchema } from "@/data/responseSchema";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

    let response: any = null;
    let lastError: any = null;
    const maxAttempts = 3;

    // Retry with exponential delay for temporary 503 load spikes
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        const isServerBusy = err?.status === 503 || err?.code === 503;
        console.warn(
          `Gemini attempt ${attempt} failed (Status: ${err?.status || err?.code}):`,
          err?.message || err
        );

        if (attempt === maxAttempts) {
          throw err;
        }

        // Wait 2s on 1st retry, 4s on 2nd retry to clear demand spikes
        const delay = isServerBusy ? attempt * 2000 : 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
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
    const status = e.status || e.code || 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? "Gemini servers are currently experiencing high demand. Please try again in a few seconds."
            : e.message || "Failed to generate configuration",
      },
      { status: typeof status === "number" && status >= 400 && status < 600 ? status : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Normalize payload whether sent as { agentConfig: ... }, { data: ... }, or flat
    const agentData =
      body.agentConfig ||
      body.AgentConfig ||
      body.data?.draftAgent ||
      body.draftAgent ||
      body;

    // 2. Accept either agentId or fallback to id
    const targetAgentId = agentData.agentId || agentData.id;

    if (!targetAgentId) {
      console.error("PUT request missing agent ID. Received body:", body);
      return NextResponse.json(
        { error: "agentId is required to update agent" },
        { status: 400 }
      );
    }

    // 3. Strip non-updatable and primary key fields
    const {
      agentId,
      id,
      createdAt,
      updatedAt,
      userEmail,
      ...updateFields
    } = agentData;

    // 4. Update row in database
    const result = await db
      .update(AgentConfig)
      .set({
        ...updateFields,
      })
      .where(eq(AgentConfig.agentId, String(targetAgentId)))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Agent not found in database" },
        { status: 404 }
      );
    }

    console.log("Updated agent successfully in DB:", result[0]);
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Agent Update Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update agent" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!user || !userEmail) {
      return NextResponse.json(
        { error: "Unauthorized User" },
        { status: 401 }
      );
    }

    const result = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.userEmail, userEmail))
      .orderBy(desc(AgentConfig.createdAt));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agent Fetch Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch agents" },
      { status: 500 }
    );
  }
}