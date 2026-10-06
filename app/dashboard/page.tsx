"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  CheckCircle2,
  Zap,
  CalendarClock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Bot,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type AgentRun = {
  id: number;
  agentId: string;
  userEmail: string | null;
  status: string;
  scheduledFor: string;
  completedAt: string | null;
  result: any;
  error: string | null;
  createdAt: string;
};

type AgentConfig = {
  agentId: string;
  name: string;
  agentImage: string;
  description: string;
  schedule: any;
  status: string;
};

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const timeGreet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${timeGreet}, ${name}`;
}

function formatRelativeTime(dateStr: string) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatUpcomingTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
}

function generateAIBriefing(
  completed: AgentRun[],
  running: AgentRun[],
  failed: AgentRun[],
  scheduled: AgentRun[]
) {
  const parts: string[] = [];
  if (completed.length > 0)
    parts.push(
      `Your agents completed ${completed.length} task${completed.length > 1 ? "s" : ""} recently.`
    );
  if (running.length > 0)
    parts.push(`${running.length} agent${running.length > 1 ? "s are" : " is"} currently running.`);
  else parts.push("No agents are running right now.");
  if (failed.length > 0)
    parts.push(`${failed.length} run${failed.length > 1 ? "s need" : " needs"} your attention.`);
  else parts.push("Everything looks clear.");
  if (scheduled.length > 0)
    parts.push(
      `${scheduled.length} run${scheduled.length > 1 ? "s are" : " is"} scheduled next.`
    );
  return parts.join(" ") || "No recent agent activity. Create an agent to get started.";
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [runsRes, agentsRes] = await Promise.all([
        axios.get("/api/agent/runs"),
        axios.get("/api/agent/configure"),
      ]);
      setRuns(Array.isArray(runsRes.data?.runs) ? runsRes.data.runs : []);
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completed = runs.filter((r) => r.status === "completed");
  const running = runs.filter((r) => r.status === "running");
  const scheduled = runs.filter((r) => r.status === "scheduled" || r.status === "queued");
  const failed = runs.filter((r) => r.status === "failed" || r.status === "cancelled");

  const agentMap = Object.fromEntries(agents.map((a) => [a.agentId, a]));

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there";
  const briefingText = generateAIBriefing(completed, running, failed, scheduled);

  const statCards = [
    {
      label: "Completed",
      sub: "finished runs",
      value: completed.length,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Running",
      sub: "active agents",
      value: running.length,
      icon: <Zap className="h-5 w-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Scheduled",
      sub: "coming up",
      value: scheduled.length,
      icon: <CalendarClock className="h-5 w-5" />,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      label: "Attention",
      sub: "need review",
      value: failed.length,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5" />
            {todayStr}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {getGreeting(firstName)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's the latest pulse from your agents, runs, schedules, and anything that needs a
            closer look.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          className="text-slate-500 hover:text-slate-900 gap-1.5 text-xs"
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh briefing
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.border} ${card.bg} p-4 flex flex-col gap-2`}
          >
            <div className={`${card.color} w-fit`}>{card.icon}</div>
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
            <div>
              <p className="text-sm font-semibold text-slate-800">{card.label}</p>
              <p className="text-xs text-slate-500">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Briefing Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Your AI briefing</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 border rounded-full px-2 py-0.5">
                Updated {formatRelativeTime(lastRefreshed.toISOString())}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-4">{briefingText}</p>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completed.length} completed
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <Zap className="h-3.5 w-3.5" />
              {running.length} running
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {failed.length} needs attention
            </span>
          </div>
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900">Needs your attention</h2>
            {failed.length > 0 && (
              <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                {failed.length}
              </span>
            )}
          </div>
          {failed.length === 0 ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              No runs need attention right now.
            </div>
          ) : (
            <div className="space-y-2">
              {failed.slice(0, 4).map((run) => {
                const agent = agentMap[run.agentId];
                return (
                  <div
                    key={run.id}
                    className="rounded-xl border border-rose-100 bg-rose-50 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center shrink-0 overflow-hidden">
                        {agent?.agentImage ? (
                          <img src={agent.agentImage} alt="" className="h-5 w-5 object-contain" />
                        ) : (
                          <Bot className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {agent?.name || run.agentId}
                        </p>
                        <p className="text-xs text-rose-600 capitalize">{run.status}</p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/agents"
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium whitespace-nowrap flex items-center gap-1"
                    >
                      Review <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Running Now */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Running now</h2>
          {running.length === 0 ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              No agents are running right now.
            </div>
          ) : (
            <div className="space-y-2">
              {running.slice(0, 4).map((run) => {
                const agent = agentMap[run.agentId];
                return (
                  <div
                    key={run.id}
                    className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center shrink-0 overflow-hidden">
                      {agent?.agentImage ? (
                        <img src={agent.agentImage} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <Bot className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {agent?.name || run.agentId}
                      </p>
                      <p className="text-xs text-blue-600">Running...</p>
                    </div>
                    <Zap className="h-4 w-4 text-blue-500 animate-pulse shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Results */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900">Latest results</h2>
            {completed.length > 0 && (
              <span className="h-5 min-w-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center px-1.5">
                {completed.length}
              </span>
            )}
          </div>
          {completed.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 text-center">
              No completed runs yet. Agents will appear here once they finish.
            </div>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 4).map((run) => {
                const agent = agentMap[run.agentId];
                return (
                  <div
                    key={run.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-slate-50 border flex items-center justify-center shrink-0 overflow-hidden">
                      {agent?.agentImage ? (
                        <img src={agent.agentImage} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <Bot className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {agent?.name || run.agentId}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {agent?.description || "Agent task completed"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-slate-400">
                        {run.completedAt ? formatRelativeTime(run.completedAt) : ""}
                      </span>
                      <Link
                        href="/dashboard/agents"
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        View result
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Up Next */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Up next</h2>
          {scheduled.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 text-center">
              No upcoming runs scheduled.{" "}
              <Link href="/dashboard/agents" className="text-purple-600 hover:underline">
                Schedule one →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduled.slice(0, 4).map((run) => {
                const agent = agentMap[run.agentId];
                return (
                  <div
                    key={run.id}
                    className="rounded-xl border border-purple-100 bg-purple-50 p-3 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-white border border-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {agent?.agentImage ? (
                        <img src={agent.agentImage} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <CalendarClock className="h-4 w-4 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {agent?.name || run.agentId}
                      </p>
                      <p className="text-xs text-purple-600">
                        {formatUpcomingTime(run.scheduledFor)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-slate-100 pt-6 flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5 text-xs"
          onClick={() => router.push("/dashboard/agents?tab=create")}
        >
          <Bot className="h-3.5 w-3.5" />
          Create Agent
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5 text-xs"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}