"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { RefreshCw, Bot, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AgentRun {
  id: number;
  agentId: string;
  userEmail: string | null;
  status: string;
  scheduledFor: string;
  queuedAt: string | null;
  inngestEventId: string | null;
  executedAt: string | null;
  completedAt: string | null;
  input: string | null;
  result: any;
  error: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface AgentConfig {
  agentId: string;
  name: string;
  agentImage: string;
  description: string;
}

function formatRelativeOrDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function AgentRunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [runsRes, agentsRes] = await Promise.all([
        axios.get("/api/agent/runs"),
        axios.get("/api/agent/configure"),
      ]);
      setRuns(Array.isArray(runsRes.data?.runs) ? runsRes.data.runs : []);
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
    } catch (err) {
      console.error("Failed to load runs:", err);
      toast.error("Failed to load agent runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const agentMap = Object.fromEntries(agents.map((a) => [a.agentId, a]));

  const completedCount = runs.filter((r) => r.status === "completed").length;
  const failedCount = runs.filter((r) => r.status === "failed" || r.status === "cancelled").length;
  const scheduledCount = runs.filter(
    (r) => r.status === "scheduled" || r.status === "queued" || r.status === "running"
  ).length;

  const getStatusPill = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "failed":
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Failed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Agent Runs</h1>
          <p className="text-sm text-slate-500 mt-1">
            See what your agents are working on and review their results.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2 text-xs rounded-xl"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Top 3 Summary Pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Completed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-slate-800">Completed</span>
          </div>
          <span className="text-xl font-bold text-slate-900">{completedCount}</span>
        </div>

        {/* Failed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-sm font-semibold text-slate-800">Failed</span>
          </div>
          <span className="text-xl font-bold text-slate-900">{failedCount}</span>
        </div>

        {/* Scheduled */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-slate-800">Scheduled</span>
          </div>
          <span className="text-xl font-bold text-slate-900">{scheduledCount}</span>
        </div>
      </div>

      {/* Recent Runs Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Recent Runs</h2>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading agent runs...
            </div>
          ) : runs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm space-y-1">
              <Bot className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No agent runs found</p>
              <p className="text-xs text-slate-400">
                Created agents with active schedules will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="py-3.5 px-6">Agent</th>
                    <th className="py-3.5 px-4">Task</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Updated</th>
                    <th className="py-3.5 px-4">Result</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {runs.map((run) => {
                    const agent = agentMap[run.agentId];
                    const agentName = agent?.name || run.agentId;
                    const taskDesc = run.input || agent?.description || "Scheduled agent run";
                    const updatedTime = formatRelativeOrDate(
                      run.completedAt || run.executedAt || run.createdAt
                    );

                    return (
                      <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Agent */}
                        <td className="py-4 px-6 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-slate-100 border flex items-center justify-center shrink-0 overflow-hidden">
                              {agent?.agentImage ? (
                                <img
                                  src={agent.agentImage}
                                  alt=""
                                  className="h-5 w-5 object-contain"
                                />
                              ) : (
                                <Bot className="h-4 w-4 text-slate-500" />
                              )}
                            </div>
                            <span className="font-semibold text-sm truncate max-w-[160px]">
                              {agentName}
                            </span>
                          </div>
                        </td>

                        {/* Task */}
                        <td className="py-4 px-4 text-slate-600 text-xs max-w-[200px] truncate">
                          {taskDesc}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">{getStatusPill(run.status)}</td>

                        {/* Updated */}
                        <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {updatedTime}
                        </td>

                        {/* Result */}
                        <td className="py-4 px-4 text-xs text-slate-600 max-w-[220px] truncate">
                          {run.error ? (
                            <span className="text-rose-600 font-medium">{run.error}</span>
                          ) : run.result ? (
                            <span className="text-slate-800">
                              {typeof run.result === "string"
                                ? run.result
                                : JSON.stringify(run.result)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Pending execution...</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRun(run)}
                            className="text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 font-medium h-8 px-3 rounded-lg"
                          >
                            View Result
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 font-medium pt-2">
          All recent agents log
        </p>
      </div>

      {/* Result Details Dialog */}
      <Dialog open={!!selectedRun} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600" />
              {agentMap[selectedRun?.agentId || ""]?.name || selectedRun?.agentId}
            </DialogTitle>
            <DialogDescription>
              Execution details and full output result for Run #{selectedRun?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedRun && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Status</span>
                  {getStatusPill(selectedRun.status)}
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Scheduled For</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedRun.scheduledFor).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Task / Prompt
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  {selectedRun.input || "Default scheduled task"}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Output Result
                </label>
                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {selectedRun.error ? (
                    <span className="text-rose-400">{selectedRun.error}</span>
                  ) : selectedRun.result ? (
                    typeof selectedRun.result === "string" ? (
                      selectedRun.result
                    ) : (
                      JSON.stringify(selectedRun.result, null, 2)
                    )
                  ) : (
                    <span className="text-slate-500">Run has not completed yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
