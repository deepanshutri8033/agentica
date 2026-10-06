import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { executeAgent, type AgentChatTurn } from "@/lib/execute-agent";
import { isGeminiQuotaError } from "@/lib/build-agent";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, input, history } = body;

    if (typeof agentId !== "string" || !agentId.trim()) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    if (typeof input !== "string" || !input.trim()) {
      return NextResponse.json(
        { error: "A non-empty chat message is required" },
        { status: 400 }
      );
    }

    if (
      history !== undefined &&
      (!Array.isArray(history) ||
        history.some(
          (turn) =>
            !turn ||
            (turn.role !== "user" && turn.role !== "agent") ||
            typeof turn.content !== "string"
        ))
    ) {
      return NextResponse.json(
        { error: "Chat history must contain user or agent messages." },
        { status: 400 }
      );
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;

    // Only load an agent owned by the authenticated user.
    const agentRecords = await db
      .select()
      .from(AgentConfig)
      .where(
        and(
          eq(AgentConfig.agentId, agentId),
          eq(AgentConfig.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!agentRecords || agentRecords.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = agentRecords[0];

    const result = await executeAgent({
      agentConfig: agent as any,
      userEmail,
      input,
      history: (history || []) as AgentChatTurn[],
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agent execution error:", error);
    const isInsufficientQuota =
      error?.code === "credit_balance_exhausted" ||
      error?.error?.code === "credit_balance_exhausted" ||
      error?.error?.type === "insufficient_quota" ||
      isGeminiQuotaError(error);

    if (isInsufficientQuota) {
      const provider =
        process.env.AGENT_MODEL_PROVIDER?.toLowerCase() ||
        (process.env.GEMINI_API_KEY ? "gemini" : "openai");
      const providerName = provider === "gemini" ? "Gemini" : "OpenAI";

      return NextResponse.json(
        {
          error:
            provider === "gemini"
              ? "Gemini API quota is exhausted for this project. Wait until the quota resets, enable billing, or use another Gemini project with available quota."
              : `The ${providerName} API account has no available quota. Check its API billing and quota settings to run agents.`,
        },
        { status: 429 }
      );
    }

    if (error?.status === 503) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Gemini is temporarily overloaded. Please wait a little and try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      {
        status:
          typeof error?.status === "number" &&
          error.status >= 400 &&
          error.status < 600
            ? error.status
            : 500,
      }
    );
  }
}