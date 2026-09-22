"use client";

import axios from "axios";
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RefreshCw, Clock, X, Plus, Wrench, Loader2, KeyRound } from "lucide-react";
import type { CreatedAgentType, AgentSchedule } from "./createAgent";

export type EditableTool = {
  slug: string;
  name?: string;
  logo?: string;
  connected?: boolean;
  connection?: {
    status?: string;
    connectedAccount?: any;
  };
  connectedAccountId?: string;
};

type Props = {
  agentConfig: CreatedAgentType | null;
  setUpdatedAgent?: (agent: CreatedAgentType) => void;
  openSheet_?: boolean;
  closeSheet: () => void;
  onSave?: (updated: CreatedAgentType) => void;
};

const NON_OAUTH_TOOLS = new Set([
  "web_search",
  "tavily",
  "browserbase",
  "browser_base",
  "exa",
  "serpapi",
  "serp_search",
]);

function AgentEditSheet({
  agentConfig,
  setUpdatedAgent,
  openSheet_ = false,
  closeSheet,
  onSave,
}: Props) {
  const [draftAgent, setDraftAgent] = useState<CreatedAgentType | null>(agentConfig);
  const [skillInput, setSkillInput] = useState("");
  const [tools, setTools] = useState<EditableTool[]>([]);
  const [activeActionSlug, setActiveActionSlug] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState(openSheet_);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenSheet(openSheet_);
    if (openSheet_) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [openSheet_]);

  const GetTools = async () => {
    if (!agentConfig?.agentId) return;
    try {
      const result = await axios.get(
        "/api/agent/tools?agentId=" + agentConfig.agentId
      );
      // Handles both direct array responses and { toolkits: [...] } wrapped payloads
      const data = result.data;
      const parsedTools = Array.isArray(data)
        ? data
        : Array.isArray(data?.toolkits)
        ? data.toolkits
        : [];
      setTools(parsedTools);
    } catch (error) {
      console.error("Failed to load tools:", error);
      setTools([]);
    }
  };

  useEffect(() => {
    setDraftAgent(agentConfig);
    if (agentConfig?.agentId) {
      GetTools();
    }
  }, [agentConfig]);

  const updateDraft = (key: string, value: any) => {
    setDraftAgent((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const safeTools = Array.isArray(tools) ? tools : [];
  const connectedToolCount = safeTools.filter(
    (t) => t?.connected || t?.connection?.status === "ACTIVE"
  ).length;

  const handleRegenerateAvatar = () => {
    const newSeed = Math.random().toString(36).substring(2, 9);
    updateDraft(
      "agentImage",
      `https://api.dicebear.com/10.x/micah/svg?seed=${newSeed}&t=${Date.now()}`
    );
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !draftAgent?.skills?.includes(trimmed)) {
      updateDraft("skills", [...(draftAgent?.skills || []), trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    updateDraft(
      "skills",
      (draftAgent?.skills || []).filter((s) => s !== skillToRemove)
    );
  };

  const handleConnectTool = async (tool: EditableTool) => {
    const targetAgentId =
      draftAgent?.agentId || agentConfig?.agentId || (draftAgent as any)?.id;

    if (!targetAgentId) {
      toast.error("Agent ID missing");
      return;
    }

    const cleanSlug = String(tool.slug || "").toLowerCase().trim();

    if (NON_OAUTH_TOOLS.has(cleanSlug)) {
      toast.info(
        `"${tool.name || cleanSlug}" uses an API key rather than OAuth popup login. Configure it directly under API Keys in your Composio project.`
      );
      return;
    }

    try {
      setActiveActionSlug(cleanSlug);
      toast.info(`Initiating connection for ${tool.name || cleanSlug}...`);

      const res = await axios.post("/api/agent/tools/connect", {
        toolSlug: cleanSlug,
        agentId: targetAgentId,
      });

      if (res.data?.redirectUrl) {
        const popup = window.open(
          res.data.redirectUrl,
          "ComposioAuthPopup",
          "width=600,height=750"
        );

        const timer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setTimeout(() => {
              GetTools();
              toast.success(`Refreshed ${tool.name || cleanSlug} connection!`);
            }, 600);
          }
        }, 1200);
      } else {
        toast.error("No authorization URL returned.");
      }
    } catch (err: any) {
      console.error("Connection failed:", err);
      toast.error(err.response?.data?.error || "Failed to initiate tool connection");
    } finally {
      setActiveActionSlug(null);
    }
  };

  const handleDisconnectTool = async (tool: EditableTool) => {
    const targetAgentId =
      draftAgent?.agentId || agentConfig?.agentId || (draftAgent as any)?.id;

    if (!targetAgentId) {
      toast.error("Agent ID missing");
      return;
    }

    const cleanSlug = String(tool.slug || "").toLowerCase().trim();

    try {
      setActiveActionSlug(cleanSlug);
      toast.info(`Disconnecting ${tool.name || cleanSlug}...`);

      await axios.delete("/api/agent/tools/connect", {
        data: {
          toolSlug: cleanSlug,
          agentId: targetAgentId,
        },
      });

      toast.success(`Disconnected ${tool.name || cleanSlug}!`);
      await GetTools();
    } catch (err: any) {
      console.error("Disconnection failed:", err);
      toast.error(err.response?.data?.error || "Failed to disconnect tool");
    } finally {
      setActiveActionSlug(null);
    }
  };

  const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const targetAgentId =
      draftAgent?.agentId || agentConfig?.agentId || (draftAgent as any)?.id;

    if (!targetAgentId) {
      toast.error("Error: Missing agent ID");
      return;
    }

    const payload = {
      ...draftAgent,
      agentId: String(targetAgentId),
    };

    try {
      const result = await axios.put("/api/agent/configure", payload);
      const savedAgent: CreatedAgentType = {
        ...(draftAgent as CreatedAgentType),
        ...(result.data || {}),
        agentId: String(targetAgentId),
        agentImage: draftAgent?.agentImage || result.data?.agentImage,
      };

      setUpdatedAgent?.(savedAgent);
      onSave?.(savedAgent);

      toast.success("Agent Updated!");
      closeSheet();
    } catch (err: any) {
      console.error("Failed to update agent:", err);
      toast.error(err.response?.data?.error || "Failed to update agent");
    }
  };

  return (
    <Sheet
      open={openSheet}
      onOpenChange={(isOpen) => {
        setOpenSheet(isOpen);
        if (!isOpen) closeSheet();
      }}
    >
      <SheetContent className="sm:max-w-lg flex flex-col h-full max-h-screen p-0 gap-0">
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative flex items-center justify-center rounded-xl bg-muted/40 border shrink-0 overflow-hidden">
              <img
                key={draftAgent?.agentImage}
                alt="logo"
                src={draftAgent?.agentImage || "/logo.svg"}
                width={28}
                height={28}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div>
              <SheetTitle>Edit Agent</SheetTitle>
              <SheetDescription>
                Update how this agent looks, works, and runs.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <div className="space-y-6 pb-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 border flex items-center justify-center overflow-hidden shrink-0">
                <img
                  key={draftAgent?.agentImage}
                  src={
                    draftAgent?.agentImage ||
                    `https://api.dicebear.com/10.x/micah/svg?seed=${draftAgent?.name || "agent"}`
                  }
                  alt={draftAgent?.name || "Agent"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Agent Avatar</p>
                <p className="text-xs text-muted-foreground">
                  Randomize or keep the generated avatar
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateAvatar}
                className="gap-1.5 text-xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Randomize
              </Button>
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-xs font-semibold">
                Agent Name
              </Label>
              <Input
                id="agent-name"
                value={draftAgent?.name || ""}
                onChange={(e) => updateDraft("name", e.target.value)}
                placeholder="e.g. Daily Focus Planner"
              />
            </div>

            {/* Agent Description */}
            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="agent-description"
                rows={2}
                value={draftAgent?.description || ""}
                onChange={(e) => updateDraft("description", e.target.value)}
                placeholder="Short summary of what this agent does"
                className="resize-none"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="agent-instructions" className="text-xs font-semibold">
                Instructions & Prompt
              </Label>
              <Textarea
                id="agent-instructions"
                rows={4}
                value={draftAgent?.instructions || draftAgent?.objective || ""}
                onChange={(e) => {
                  updateDraft("instructions", e.target.value);
                  updateDraft("objective", e.target.value);
                }}
                placeholder="Custom system instructions or goal execution logic"
              />
            </div>

            {/* Schedule Section */}
            <div className="p-4 border rounded-2xl bg-card space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose when and how often this agent runs.
                </p>
              </div>

              {/* Row: Run Type & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Run Type</Label>
                  <Select
                    value={draftAgent?.schedule?.type || "recurring"}
                    onValueChange={(val) =>
                      updateDraft("schedule", {
                        ...(draftAgent?.schedule || {}),
                        type: val as AgentSchedule["type"],
                      })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">recurring</SelectItem>
                      <SelectItem value="once">once</SelectItem>
                      <SelectItem value="manual">manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Time</Label>
                  <div className="relative">
                    <Input
                      value={draftAgent?.schedule?.time || "09:22 PM"}
                      onChange={(e) =>
                        updateDraft("schedule", {
                          ...(draftAgent?.schedule || {}),
                          time: e.target.value,
                        })
                      }
                      placeholder="09:22 PM"
                      className="h-10 rounded-xl pr-9 text-sm"
                    />
                    <Clock className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Frequency</Label>
                <Select
                  value={draftAgent?.schedule?.frequency || "daily"}
                  onValueChange={(val) =>
                    updateDraft("schedule", {
                      ...(draftAgent?.schedule || {}),
                      frequency: val as AgentSchedule["frequency"],
                    })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">hourly</SelectItem>
                    <SelectItem value="daily">daily</SelectItem>
                    <SelectItem value="weekly">weekly</SelectItem>
                    <SelectItem value="monthly">monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Skills</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add or remove capabilities this agent should use.
                </p>
              </div>

              <div className="p-3 border rounded-2xl bg-card flex flex-wrap gap-2 min-h-[60px] items-center">
                {(draftAgent?.skills || []).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground border shadow-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-destructive focus:outline-none cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  autoComplete="off"
                  placeholder="Add a skill"
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSkill}
                  className="h-9 gap-1 text-xs px-3 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>

            {/* Connected Tools */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Connected Tools</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {connectedToolCount} of {safeTools.length} connected
                </p>
              </div>

              <div className="space-y-2.5">
                {safeTools.map((tool, index) => {
                  const cleanSlug = String(tool.slug || "").toLowerCase().trim();
                  const isNonOAuth = NON_OAUTH_TOOLS.has(cleanSlug);
                  const isProcessing = activeActionSlug === cleanSlug;
                  const isConnected =
                    tool.connected || tool.connection?.status === "ACTIVE";

                  return (
                    <div
                      key={tool.slug || index}
                      className="p-3 border rounded-2xl bg-card flex items-center justify-between gap-3 shadow-sm hover:border-muted-foreground/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted/60 border flex items-center justify-center shrink-0 overflow-hidden relative">
                          {tool.logo ? (
                            <img
                              src={tool.logo}
                              alt={tool.name || tool.slug}
                              className="h-5 w-5 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback = e.currentTarget.parentElement?.querySelector(
                                  ".fallback-icon"
                                ) as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="fallback-icon items-center justify-center text-muted-foreground w-full h-full"
                            style={{ display: tool.logo ? "none" : "flex" }}
                          >
                            <Wrench className="h-4 w-4" />
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold leading-none">
                            {tool.name || tool.slug}
                          </p>
                          <p className="text-xs mt-1 font-medium">
                            {isNonOAuth ? (
                              <span className="text-muted-foreground">API Key Ready</span>
                            ) : isConnected ? (
                              <span className="text-emerald-600">Connected</span>
                            ) : (
                              <span className="text-red-500">Not connected</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {isNonOAuth ? (
                        <Badge
                          variant="secondary"
                          className="h-8 px-3 text-xs font-normal gap-1.5 border"
                        >
                          <KeyRound className="h-3 w-3 text-muted-foreground" />
                          API Key
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => {
                            if (isConnected) {
                              handleDisconnectTool(tool);
                            } else {
                              handleConnectTool(tool);
                            }
                          }}
                          variant={isConnected ? "outline" : "default"}
                          className={
                            isConnected
                              ? "h-8 text-xs px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              : "h-8 text-xs px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          }
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isConnected ? (
                            "Disconnect"
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <Label htmlFor="agent-output" className="text-xs font-semibold">
                Output Format
              </Label>
              <Textarea
                id="agent-output"
                rows={3}
                value={draftAgent?.outputFormat || ""}
                onChange={(e) => updateDraft("outputFormat", e.target.value)}
                placeholder="Define how the agent formats and delivers results..."
                className="resize-none text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4 shrink-0 bg-background">
          <div className="flex justify-end gap-2.5 w-full">
            <SheetClose
              onClick={closeSheet}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              Cancel
            </SheetClose>
            <Button
              onClick={handleSubmit}
              className="bg-purple-700 hover:bg-purple-800 text-white cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AgentEditSheet;