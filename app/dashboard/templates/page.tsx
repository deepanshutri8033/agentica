"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Bot,
  ArrowRight,
  MessageSquare,
  Mail,
  Github,
  Calendar,
  Globe,
  FileText,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  title: string;
  category: "Communication" | "Productivity" | "Developer" | "Web Automation";
  description: string;
  prompt: string;
  tools: { name: string; icon: string }[];
  schedule: string;
  popular?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: "slack-evening-greeting",
    title: "Daily Slack Evening Greeting",
    category: "Communication",
    description: "Sends a personalized evening greeting and daily wrap-up directly to your Slack channel.",
    prompt: "Send a friendly evening greeting and brief daily status wrap-up message to my Slack channel at 6:00 PM every day.",
    tools: [{ name: "Slack", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" }],
    schedule: "Daily at 6:00 PM",
    popular: true,
  },
  {
    id: "unread-email-digest",
    title: "Daily Unread Email Digest",
    category: "Productivity",
    description: "Scans your Gmail for unread emails and generates a concise morning digest summary.",
    prompt: "Check my Gmail inbox for important unread messages received in the last 24 hours and send me a bulleted summary digest.",
    tools: [{ name: "Gmail", icon: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" }],
    schedule: "Daily at 8:00 AM",
    popular: true,
  },
  {
    id: "github-issue-monitor",
    title: "GitHub Issue & PR Summarizer",
    category: "Developer",
    description: "Monitors your GitHub repository for newly created issues and open pull requests requiring review.",
    prompt: "Fetch all new GitHub issues and pull requests created in the last 24 hours. Summarize action items for the dev team.",
    tools: [{ name: "GitHub", icon: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" }],
    schedule: "Daily at 9:00 AM",
  },
  {
    id: "browserbase-web-monitor",
    title: "Live Price & Web Monitor",
    category: "Web Automation",
    description: "Uses Browserbase headless browsing to monitor product prices and website availability in real-time.",
    prompt: "Use Browserbase to research live prices and stock availability for specified target products on e-commerce sites.",
    tools: [{ name: "Browserbase", icon: "🌐" }],
    schedule: "Every 6 Hours",
    popular: true,
  },
  {
    id: "google-calendar-briefing",
    title: "Daily Calendar Agenda Briefing",
    category: "Productivity",
    description: "Summarizes your Google Calendar events for the day and prepares agenda reminders.",
    prompt: "Fetch all events on my Google Calendar for today, highlight upcoming meetings, and send a summary briefing.",
    tools: [{ name: "Google Calendar", icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" }],
    schedule: "Daily at 7:30 AM",
  },
  {
    id: "notion-meeting-notes",
    title: "Notion Action Item Extractor",
    category: "Productivity",
    description: "Extracts key action items from meeting logs and formats them directly into Notion pages.",
    prompt: "Extract all key action items, deadlines, and assigned tasks from my meeting notes and record them in Notion.",
    tools: [{ name: "Notion", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg" }],
    schedule: "On Demand",
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Communication", "Productivity", "Developer", "Web Automation"];

  const filteredTemplates =
    selectedCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleUseTemplate = (template: Template) => {
    // Store pre-filled prompt in localStorage or pass via URL query param
    const query = new URLSearchParams({
      prompt: template.prompt,
      name: template.title,
    }).toString();
    router.push(`/dashboard/agents?${query}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Agent Templates</h1>
        </div>
        <p className="text-sm text-slate-500">
          Choose a pre-built agent template to get started instantly with automated workflows.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between gap-5 shadow-sm hover:border-slate-300 transition-all relative group"
          >
            <div className="space-y-3">
              {/* Header Badge & Tools */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-normal border-slate-200">
                  {template.category}
                </Badge>
                {template.popular && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                    <Zap className="h-3 w-3 fill-purple-600" /> Popular
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  {template.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {template.description}
                </p>
              </div>

              {/* Prompt Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 line-clamp-3 italic">
                "{template.prompt}"
              </div>
            </div>

            {/* Footer: Schedule & Action */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Schedule:</span>
                <span className="font-semibold text-slate-700">{template.schedule}</span>
              </div>

              <Button
                onClick={() => handleUseTemplate(template)}
                className="w-full h-10 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white gap-2 cursor-pointer shadow-xs"
              >
                Use Template <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
