"use client";

import * as React from "react";
import { useState } from "react";
import axios from "axios";
import {
  BriefcaseBusiness,
  Mail,
  Search,
  ArrowUp,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AIAgentQuestions from "./AIAgentQuestions";
import NewAgentCard from "./NewAgentCard";

const quickSuggestions = [
  {
    label: "Find Jobs",
    prompt:
      "Find the latest AI developer jobs posted this week that match my skillset",
  },
  {
    label: "Inbox Summary",
    prompt:
      "Check my inbox and summarize the most important emails, action items, and follow-ups",
  },
  {
    label: "Research Topic",
    prompt:
      "Research a topic across the web, compare multiple sources, and generate a concise breakdown",
  },
  {
    label: "Plan My Day",
    prompt:
      "Check my calendar and upcoming tasks, then create a prioritized schedule for today",
  },
  {
    label: "Reddit Trends",
    prompt:
      "Find trending Reddit discussions about AI tools and agent workflows from the past 24 hours",
  },
];

const templates = [
  {
    title: "Find latest jobs",
    description: "Search the web for the latest jobs matching my profile.",
    prompt: "Find the latest AI developer jobs posted this week that match my skillset",
    icon: BriefcaseBusiness,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    border: "hover:border-orange-300",
    glow: "hover:shadow-orange-100",
  },
  {
    title: "Daily inbox summary",
    description: "Summarize important emails and highlight what needs my attention.",
    prompt: "Check my inbox and summarize the most important emails, action items, and follow-ups",
    icon: Mail,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    border: "hover:border-blue-300",
    glow: "hover:shadow-blue-100",
  },
  {
    title: "Research a topic",
    description: "Search the web and create a useful research summary for me.",
    prompt: "Research a topic across the web, compare multiple sources, and generate a concise breakdown",
    icon: Search,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    border: "hover:border-purple-300",
    glow: "hover:shadow-purple-100",
  },
];

export type ClarificationQuestion = {
  id: string;
  question: string;
  type: "single_select" | "multi_select" | "text" | "number";
  options: string[];
  allowCustom?: boolean;
  customPlaceholder?: string;
};

export type AgentConfigResp = {
  status: "needs_clarification" | "ready";
  clarificationQuestions: ClarificationQuestion[];
  config: any;
  agent?: CreatedAgentType;
};

export type AgentSchedule = {
  type: "once" | "recurring" | "manual";
  frequency?: "hourly" | "daily" | "weekly" | "monthly";
  time?: string;
  date?: string;
  timezone?: string;
  daysOfWeek?: string[];
};

export type CreatedAgentType = {
  id: number;
  userEmail: string;
  agentId: string;
  name: string;
  agentImage: string;
  description: string;
  instructions: string;
  objective: string;
  tools: any;
  skills: string[];
  schedule: AgentSchedule;
  outputFormat: string;
  status: string;
  createdAt: string;
};

function CreateAgent() {
  const [prompt, setPrompt] = useState("");
  const [configResult, setConfigResult] = useState<AgentConfigResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgentType | null>(null);

  const onSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const result = await axios.post("/api/agent/configure", {
        prompt: prompt,
      });

      setConfigResult(result.data);

      if (result.data?.status === "ready") {
        const savedRecord =
          result.data?.agent || (Array.isArray(result.data) ? result.data[0] : result.data);
        setCreatedAgent(savedRecord);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to configure agent";
      console.error("Configuration request failed:", errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onComplete = async (ans: any) => {
    setConfigResult(null);
    const updatedPrompt = `${prompt}\nClarification details: ${JSON.stringify(ans)}`;
    setLoading(true);

    try {
      const result = await axios.post("/api/agent/configure", {
        prompt: updatedPrompt,
      });

      setConfigResult(result.data);

      if (result.data?.status === "ready") {
        const savedRecord =
          result.data?.agent || (Array.isArray(result.data) ? result.data[0] : result.data);
        setCreatedAgent(savedRecord);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to finalize agent configuration";
      console.error("Finalization request failed:", errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Create New Agent</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask what type of agent you want to create. Type your goal, task, and workflow.
        </p>
      </div>

      {/* Prompt Box */}
      <div className="w-full border rounded-2xl bg-background p-3 mt-3 shadow-lg shadow-purple-100 hover:shadow-purple-200 transition-all">
        <textarea
          placeholder="Describe the agent you want to create..."
          className="min-h-[90px] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="flex justify-between items-center">
          <div>
            <Button variant="ghost" size="icon" type="button">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <Button
            disabled={loading || !prompt.trim()}
            onClick={onSubmit}
            size="icon"
            className="h-9 w-9 rounded-full bg-purple-600 hover:bg-purple-700"
            type="button"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {quickSuggestions.map((suggestion, index) => (
          <Button
            key={`suggestion-${index}`}
            variant="outline"
            onClick={() => setPrompt(suggestion.prompt)}
            className="hover:text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
          >
            {suggestion.label}
          </Button>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex gap-3 items-center p-5 mt-7 border rounded-xl shadow-sm bg-card text-card-foreground">
          <Loader2 className="animate-spin h-5 w-5 text-purple-600" />
          <h2 className="text-sm font-medium">Generating Agent Configuration...</h2>
        </div>
      )}

      {/* Template Suggestions */}
      {!loading && !configResult && (
        <div className="mt-10">
          <div className="flex text-lg justify-between items-center font-semibold">
            <span>Get Started</span>
            <span className="text-sm font-medium text-muted-foreground hover:cursor-pointer">
              View All
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-3">
            {templates.map((template, index) => (
              <div
                key={`template-${index}`}
                onClick={() => setPrompt(template.prompt)}
                className={`border rounded-2xl p-5 hover:cursor-pointer hover:shadow-lg transition-all ${template.border} ${template.glow}`}
              >
                <template.icon
                  className={`h-12 w-12 p-2 ${template.iconBg} ${template.iconColor} rounded-lg`}
                />
                <div className="mt-6">
                  <h2 className="font-semibold text-foreground">{template.title}</h2>
                  <p className="text-sm mt-2 leading-5 text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Flow / Questions / Ready Card */}
      {!loading && configResult && (
        <div className="p-5 border rounded-2xl mt-6 bg-card text-card-foreground shadow-sm">
          {configResult.status === "needs_clarification" && (
            <AIAgentQuestions
              questionList={configResult.clarificationQuestions}
              onComplete={(resp: any) => onComplete(resp)}
            />
          )}
          {configResult.status === "ready" && (
            <NewAgentCard
              createdAgent={createdAgent}
              setUpdatedAgent={(val) => setCreatedAgent({ ...val })}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default CreateAgent;