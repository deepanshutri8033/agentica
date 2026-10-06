import { ai } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { AgentConfig, agentRuns } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getNextScheduledOccurrence } from "@/lib/inngest/schedule-utils";

export const runtime = "nodejs";

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

// GET: Fetch all agents owned by the logged-in user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;

    const userAgents = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.userEmail, userEmail))
      .orderBy(desc(AgentConfig.createdAt));

    return NextResponse.json(userAgents, { status: 200 });
  } catch (err: any) {
    console.error("Failed to fetch user agents:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Generate interactive clarification questions or final agent config via Gemini
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

    // Determine if this is initial prompt or final submission with answers
    const isClarificationAnswered = prompt.includes("Clarification details:");

    if (!isClarificationAnswered) {
      // -------------------------------------------------------------
      // STEP 1: Generate Interactive Clarification Questions
      // -------------------------------------------------------------
      let responseText = "";
      let lastError: any = null;

      const systemInstruction = `You are an AI Agent builder. Analyze the user request and generate 2 relevant, specific clarification questions to help tailor the agent's behavior, tone, destination, or schedule.
Respond ONLY in valid JSON matching this exact structure:
{
  "status": "needs_clarification",
  "clarificationQuestions": [
    {
      "id": "q1",
      "question": "string",
      "type": "single_select",
      "options": ["string", "string", "string", "Other / Custom"],
      "allowCustom": true,
      "customPlaceholder": "string"
    },
    {
      "id": "q2",
      "question": "string",
      "type": "single_select",
      "options": ["string", "string", "string", "Other / Custom"],
      "allowCustom": true,
      "customPlaceholder": "string"
    }
  ]
}
Do not wrap in markdown syntax.`;

      for (const model of GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `User Agent Request: ${prompt}`,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.3,
            },
          });

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
        }
      }

      if (responseText) {
        responseText = responseText.trim();
        if (responseText.startsWith("```")) {
          responseText = responseText
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "");
        }

        try {
          const parsed = JSON.parse(responseText);
          if (parsed.clarificationQuestions && parsed.clarificationQuestions.length > 0) {
            return NextResponse.json(parsed, { status: 200 });
          }
        } catch (e) {
          console.warn("Failed to parse clarification JSON, falling back to default questions");
        }
      }

      // Fallback default questions if model fails to output valid JSON
      return NextResponse.json(
        {
          status: "needs_clarification",
          clarificationQuestions: [
            {
              id: "q1",
              question: "What kind of greeting message or content would you like to send?",
              type: "single_select",
              options: [
                "Friendly good evening greeting",
                "Motivational quote & check-in",
                "Daily reflection & wrap-up",
                "Other / Custom",
              ],
              allowCustom: true,
              customPlaceholder: "Specify custom message...",
            },
            {
              id: "q2",
              question: "Where should this agent post or deliver updates?",
              type: "single_select",
              options: [
                "Personal Slack channel",
                "Direct message to myself",
                "Team Announcements channel",
                "Other / Custom",
              ],
              allowCustom: true,
              customPlaceholder: "Specify custom destination...",
            },
          ],
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------
    // STEP 2: Finalize Agent Config & Save to Database + Schedule Run
    // -------------------------------------------------------------
    let responseText = "";
    let lastError: any = null;

    const finalSystemInstruction = `You are an AI Agent builder assistant. Create the complete agent configuration based on user intent and clarification answers.
Respond in valid JSON with this exact structure:
{
  "name": "string",
  "description": "string",
  "instructions": "string",
  "suggestedTools": ["string"],
  "schedule": {
    "type": "recurring",
    "frequency": "daily",
    "time": "22:00",
    "intervalMinutes": 1440
  }
}
Do not wrap response in markdown blocks.`;

    for (const model of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: finalSystemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: lastError?.message || "Failed to finalize agent configuration." },
        { status: 500 }
      );
    }

    responseText = responseText.trim();
    if (responseText.startsWith("```")) {
      responseText = responseText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsedConfig = JSON.parse(responseText);
    const generatedAgentId = `agent_${Math.random().toString(36).substring(2, 11)}`;
    const schedule = {
      ...(parsedConfig.schedule || { type: "recurring", frequency: "daily", time: "09:00" }),
      timezone: body.timezone || "UTC",
    };

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
      schedule,
      outputFormat: "text",
      status: "active",
      createdAt: new Date(),
      composioSessionId: "",
    };

    // Save agent config record to PostgreSQL database
    await db.insert(AgentConfig).values(newAgentRecord as any);

    const firstRunDate = getNextScheduledOccurrence(schedule, new Date());
    if (firstRunDate) {
      await db.insert(agentRuns).values({
        agentId: generatedAgentId,
        userEmail,
        status: "scheduled",
        scheduledFor: firstRunDate,
        input: parsedConfig.instructions || prompt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

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
    console.error("Gemini Agent Configure API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing agent config (status, instructions, schedule, etc.)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const editableFields = [
      "name",
      "agentImage",
      "description",
      "instructions",
      "objective",
      "tools",
      "skills",
      "schedule",
      "outputFormat",
      "status",
    ] as const;
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;
    const [existingAgent] = await db
      .select()
      .from(AgentConfig)
      .where(
        and(
          eq(AgentConfig.agentId, agentId),
          eq(AgentConfig.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const updateFields = Object.fromEntries(
      editableFields
        .filter((field) => Object.hasOwn(body, field))
        .map((field) => [field, body[field]])
    ) as Partial<typeof AgentConfig.$inferInsert>;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No editable agent fields were provided" },
        { status: 400 }
      );
    }

    const shouldReplan =
      Object.hasOwn(body, "schedule") || Object.hasOwn(body, "status");
    const effectiveSchedule =
      (updateFields.schedule as typeof existingAgent.schedule | undefined) ||
      existingAgent.schedule;
    const effectiveStatus = updateFields.status || existingAgent.status;
    const nextScheduledFor =
      shouldReplan && effectiveStatus === "active"
        ? getNextScheduledOccurrence(effectiveSchedule, new Date())
        : null;

    const [updatedAgent] = await db
      .update(AgentConfig)
      .set(updateFields)
      .where(
        and(
          eq(AgentConfig.agentId, agentId),
          eq(AgentConfig.userEmail, userEmail)
        )
      )
      .returning();

    if (!updatedAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (shouldReplan) {
      await db
        .update(agentRuns)
        .set({
          status: "cancelled",
          error: "Schedule changed or agent paused.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agentRuns.agentId, agentId),
            inArray(agentRuns.status, ["scheduled", "queued"])
          )
        );

      if (nextScheduledFor) {
        await db.insert(agentRuns).values({
          agentId,
          userEmail,
          status: "scheduled",
          scheduledFor: nextScheduledFor,
          input: updatedAgent.objective || updatedAgent.instructions,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true, agentId, ...updateFields }, { status: 200 });
  } catch (err: any) {
    console.error("Failed to update agent:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an agent and its associated scheduled runs
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const agentId = searchParams.get("agentId") || body.agentId;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;
    const [ownedAgent] = await db
      .select({ agentId: AgentConfig.agentId })
      .from(AgentConfig)
      .where(
        and(
          eq(AgentConfig.agentId, agentId),
          eq(AgentConfig.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!ownedAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete associated runs first
    await db.delete(agentRuns).where(eq(agentRuns.agentId, agentId));
    // Delete agent config
    await db
      .delete(AgentConfig)
      .where(
        and(
          eq(AgentConfig.agentId, agentId),
          eq(AgentConfig.userEmail, userEmail)
        )
      );

    return NextResponse.json({ success: true, deletedAgentId: agentId }, { status: 200 });
  } catch (err: any) {
    console.error("Failed to delete agent:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}