"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock as CalendarClockIcon,
  MoreHorizontal,
  PauseIcon,
  Pencil,
  Play,
  Trash,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import AgentEditSheet from "./AgentEditSheet";
import AgentChatSheet from "./AgentChatSheet";
import type { CreatedAgentType } from "./createAgent";

function MyAgents() {
  const [myAgents, setMyAgents] = useState<CreatedAgentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);

  // Edit Sheet State
  const [editingAgent, setEditingAgent] = useState<CreatedAgentType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Chat Sheet State
  const [chatAgent, setChatAgent] = useState<CreatedAgentType | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Fetch all user agents
  const AllUserAgents = async () => {
    try {
      setLoading(true);
      const result = await axios.get("/api/agent/configure");
      setMyAgents(result.data || []);
    } catch (error) {
      console.error("Failed to fetch user agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AllUserAgents();
  }, []);

  const handleUpdateAgent = (updatedAgent: CreatedAgentType) => {
    setMyAgents((prev) =>
      prev.map((agent) =>
        agent.agentId === updatedAgent.agentId ? { ...updatedAgent } : agent
      )
    );
  };

  const handleRunAgent = async (agent: CreatedAgentType) => {
    try {
      setRunningAgentId(agent.agentId);
      toast.info(`Triggering execution for ${agent.name}...`);

      const res = await axios.post("/api/agent/run", {
        agentId: agent.agentId,
      });

      console.log("Agent run response:", res.data);
      toast.success(`${agent.name} executed successfully!`);
    } catch (err: any) {
      console.error("Failed to execute agent:", err);
      toast.error(
        err.response?.data?.error || `Failed to run ${agent.name}`
      );
    } finally {
      setRunningAgentId(null);
    }
  };

  const handleOpenChat = (agent: CreatedAgentType) => {
    setChatAgent(agent);
    setIsChatOpen(true);
  };

  return (
    <div className="mt-5 space-y-4">
      <div>
        <h2 className="font-bold text-2xl tracking-tight">My Agents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Run, Manage and Update All the agents you've created.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-purple-600" />
          Loading your agents...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {myAgents?.map((agent, index) => {
            const isRunning = runningAgentId === agent.agentId;

            return (
              <div
                key={agent.agentId || index}
                className="p-5 border rounded-2xl bg-card shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="size-16 p-2 bg-slate-100 dark:bg-zinc-800/60 border rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        key={agent.agentImage}
                        src={agent.agentImage || "/logo.svg"}
                        alt={agent.name || "Agent"}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent outline-none cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleOpenChat(agent)}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" /> Chat With Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleRunAgent(agent)}
                            disabled={isRunning}
                          >
                            <Play className="mr-2 h-4 w-4" /> Run Now
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <PauseIcon className="mr-2 h-4 w-4" /> Pause Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setEditingAgent(agent);
                              setIsEditOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit Agent
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer">
                            <Trash className="mr-2 h-4 w-4" /> Delete Agent
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-base text-foreground leading-snug">
                      {agent.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 capitalize">
                      {agent.status || "active"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                    {agent.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <CalendarClockIcon className="h-4 w-4 shrink-0" />
                    <p className="capitalize">
                      {agent?.schedule?.frequency || "on-demand"}
                      {agent?.schedule?.time && (
                        <span>&nbsp; at {agent.schedule.time}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRunAgent(agent)}
                      disabled={isRunning}
                      className="w-full text-xs font-medium rounded-xl h-9 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Run Agent</span>
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleOpenChat(agent)}
                      className="w-full text-xs font-medium rounded-xl h-9 bg-purple-700 hover:bg-purple-800 text-white cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Chat With Agent</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Agent Sheet */}
      <AgentEditSheet
        agentConfig={editingAgent}
        openSheet_={isEditOpen}
        closeSheet={() => {
          setIsEditOpen(false);
          setEditingAgent(null);
        }}
        setUpdatedAgent={handleUpdateAgent}
      />

      {/* Chat With Agent Sheet */}
      <AgentChatSheet
        agent={chatAgent}
        open={isChatOpen}
        onOpenChange={(open) => {
          setIsChatOpen(open);
          if (!open) setChatAgent(null);
        }}
      />
    </div>
  );
}

export default MyAgents;