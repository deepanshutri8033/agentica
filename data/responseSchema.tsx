import { Type } from "@google/genai";

export const AgentConfigRespSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ["needs_clarification", "ready"],
    },
    clarificationQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ["single_select", "multi_select", "text"],
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          allowCustom: { type: Type.BOOLEAN },
          customPlaceholder: { type: Type.STRING },
        },
        required: ["id", "question", "type"],
      },
    },
    config: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        agentPrompt: { type: Type.STRING },
        schedule: {
          type: Type.OBJECT,
          properties: {
            frequency: {
              type: Type.STRING,
              enum: ["Daily", "Hourly", "Weekly", "Once"],
            },
            time: { type: Type.STRING },
          },
          required: ["frequency"],
        },
        maxSteps: { type: Type.INTEGER },
        tools: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        output: { type: Type.STRING },
        notifications: { type: Type.STRING },
      },
    },
  },
  required: ["status"],
};