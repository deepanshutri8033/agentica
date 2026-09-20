"use client";

import axios from "axios";
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { RefreshCw, Clock, X, Plus } from "lucide-react";
import type { CreatedAgentType, AgentSchedule } from "./createAgent";

type Props = {
  children: React.ReactNode;
  agentConfig: CreatedAgentType | null;
  setUpdatedAgent?: (agent: CreatedAgentType) => void;
  onSave?: (updated: CreatedAgentType) => void;
};

function AgentEditSheet({
  children,
  agentConfig,
  setUpdatedAgent,
  onSave,
}: Props) {
  const [openSheet, setOpenSheet] = useState(false);
  const [draftAgent, setDraftAgent] = useState<CreatedAgentType | null>(agentConfig);
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    setDraftAgent(agentConfig);
  }, [agentConfig]);

  const tools = useMemo(() => {
    return (
      draftAgent?.tools || [
        {
          name: "google_calendar",
          label: "google_calendar",
          description: "Not connected",
          connected: false,
          icon: "/google-calendar.svg",
        },
        {
          name: "notion",
          label: "notion",
          description: "Not connected",
          connected: false,
          icon: "/notion.svg",
        },
      ]
    );
  }, [draftAgent?.tools]);

  const connectedToolCount = useMemo(() => {
    return tools.filter((tool: any) => tool.connected).length;
  }, [tools]);

  const hasSchedule =
    draftAgent?.schedule?.type === "once" ||
    draftAgent?.schedule?.type === "recurring";

  const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!draftAgent) return;

    try {
      // Save directly to the database via API
      const result = await axios.put("/api/agent/configure", draftAgent);
      console.log(result.data);

      const savedAgent = result.data || draftAgent;
      setUpdatedAgent?.(savedAgent);
      onSave?.(savedAgent);

      toast.success("Agent Updated!");
      setOpenSheet(false);
    } catch (err) {
      console.error("Failed to update agent:", err);
      toast.error("Failed to update agent");
    }
  };

  if (!draftAgent) {
    return null;
  }

  const handleRegenerateAvatar = () => {
    const newSeed = Math.random().toString(36).substring(2, 9);
    setDraftAgent((prev) =>
      prev
        ? {
            ...prev,
            agentImage: `https://api.dicebear.com/10.x/micah/svg?seed=${newSeed}`,
          }
        : null
    );
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !draftAgent.skills?.includes(trimmed)) {
      setDraftAgent((prev) =>
        prev
          ? {
              ...prev,
              skills: [...(prev.skills || []), trimmed],
            }
          : null
      );
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setDraftAgent((prev) =>
      prev
        ? {
            ...prev,
            skills: (prev.skills || []).filter((s) => s !== skillToRemove),
          }
        : null
    );
  };

  return (
    <Sheet open={openSheet} onOpenChange={setOpenSheet}>
      <SheetTrigger className="cursor-pointer">{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col h-full max-h-screen p-0 gap-0">
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative flex items-center justify-center rounded-xl bg-muted/40 border shrink-0 overflow-hidden">
              <img
                alt="logo"
                src={draftAgent.agentImage || "/logo.svg"}
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

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <div className="space-y-6 pb-4">
            {/* Avatar */}
            <div className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 border flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={
                    draftAgent.agentImage ||
                    `https://api.dicebear.com/10.x/micah/svg?seed=${draftAgent.name || "agent"}`
                  }
                  alt={draftAgent.name || "Agent"}
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

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-xs font-semibold">
                Agent Name
              </Label>
              <Input
                id="agent-name"
                value={draftAgent.name || ""}
                onChange={(e) =>
                  setDraftAgent((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                placeholder="e.g. Daily Focus Planner"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="agent-description"
                rows={2}
                value={draftAgent.description || ""}
                onChange={(e) =>
                  setDraftAgent((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
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
                value={draftAgent.instructions || draftAgent.objective || ""}
                onChange={(e) =>
                  setDraftAgent((prev) =>
                    prev
                      ? {
                          ...prev,
                          instructions: e.target.value,
                          objective: e.target.value,
                        }
                      : null
                  )
                }
                placeholder="Custom system instructions or goal execution logic"
              />
            </div>

            {/* Schedule */}
            {hasSchedule && (
              <div className="p-4 border rounded-2xl bg-card space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose when and how often this agent runs.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Run type</Label>
                    <Select
                      value={draftAgent.schedule?.type || "recurring"}
                      onValueChange={(val) =>
                        setDraftAgent((prev) =>
                          prev
                            ? {
                                ...prev,
                                schedule: {
                                  ...prev.schedule,
                                  type: (val ?? "recurring") as AgentSchedule["type"],
                                },
                              }
                            : null
                        )
                      }
                    >
                      <SelectTrigger className="h-9">
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
                    <Label className="text-xs font-medium text-muted-foreground">Time</Label>
                    <div className="relative">
                      <Input
                        value={draftAgent.schedule?.time || "08:58 AM"}
                        onChange={(e) =>
                          setDraftAgent((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  schedule: {
                                    ...prev.schedule,
                                    time: e.target.value,
                                  },
                                }
                              : null
                          )
                        }
                        placeholder="08:58 AM"
                        className="h-9 pr-8"
                      />
                      <Clock className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
                  <Select
                    value={draftAgent.schedule?.frequency || "daily"}
                    onValueChange={(val) =>
                      setDraftAgent((prev) =>
                        prev
                          ? {
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                frequency: (val ?? "daily") as AgentSchedule["frequency"],
                              },
                            }
                          : null
                      )
                    }
                  >
                    <SelectTrigger className="h-9">
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
            )}

            {/* Skills */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Skills</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add or remove capabilities this agent should use.
                </p>
              </div>

              <div className="p-3 border rounded-2xl bg-card flex flex-wrap gap-2 min-h-[60px] items-center">
                {(draftAgent.skills || []).map((skill) => (
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
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
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
                  {connectedToolCount} of {tools.length} connected
                </p>
              </div>

              <div className="space-y-2.5">
                {tools.map((tool: any, idx: number) => (
                  <div
                    key={tool.name || idx}
                    className="p-3 border rounded-2xl bg-card flex items-center justify-between gap-3 shadow-sm hover:border-muted-foreground/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted/60 border flex items-center justify-center shrink-0">
                        {tool.icon ? (
                          <img
                            src={tool.icon}
                            alt={tool.label || tool.name}
                            className="h-5 w-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold leading-none">
                          {tool.label || tool.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tool.connected ? (
                            <span className="text-emerald-600 font-medium">Connected</span>
                          ) : (
                            "Not connected"
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={tool.connected ? "outline" : "default"}
                      className={
                        tool.connected
                          ? "h-8 text-xs px-3"
                          : "h-8 text-xs px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      }
                    >
                      {tool.connected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                ))}
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
                value={draftAgent.outputFormat || ""}
                onChange={(e) =>
                  setDraftAgent((prev) =>
                    prev ? { ...prev, outputFormat: e.target.value } : null
                  )
                }
                placeholder="Define how the agent formats and delivers results..."
                className="resize-none text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4 shrink-0 bg-background">
          <div className="flex justify-end gap-2.5 w-full">
            <SheetClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
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