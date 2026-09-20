"use client";

import * as React from "react";
import type { CreatedAgentType } from "./createAgent";
import {
  CalendarCheck2Icon,
  Pencil,
  MoreHorizontal,
  Play,
  PauseIcon,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AgentEditSheet from "./AgentEditSheet";

type Props = {
  createdAgent: CreatedAgentType | null;
  setUpdatedAgent?: (agent: CreatedAgentType) => void;
};

function NewAgentCard({ createdAgent, setUpdatedAgent }: Props) {
  if (!createdAgent) return null;

  return (
    <div className="p-4 border rounded-2xl bg-card shadow-sm flex items-start gap-4 justify-between">
      {/* Left side: Avatar + Info */}
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 p-2 bg-muted/40 border rounded-2xl flex items-center justify-center shrink-0">
          <img
            key={createdAgent.agentImage}
            src={
              createdAgent.agentImage ||
              `https://api.dicebear.com/10.x/micah/svg?seed=${createdAgent.name || "agent"}`
            }
            alt={createdAgent.name || "Agent Avatar"}
            width={48}
            height={48}
            className="object-contain"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base text-foreground">
              {createdAgent.name}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 capitalize">
              {createdAgent.status || "ready"}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
            {createdAgent.description}
          </p>

          <div className="flex gap-5 text-muted-foreground text-sm items-center mt-2.5">
            <div className="flex gap-2 items-center">
              <CalendarCheck2Icon className="h-4 w-4" />
              <span>Next Run on {createdAgent.schedule?.time || "immediate"}</span>
            </div>
            <span>Runs {createdAgent.schedule?.frequency || "on-demand"}</span>
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <AgentEditSheet
          agentConfig={createdAgent}
          setUpdatedAgent={setUpdatedAgent}
        >
          <div className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
            <Pencil className="h-4 w-4" />
          </div>
        </AgentEditSheet>

        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent outline-none">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <Play className="mr-2 h-4 w-4" /> Run Now
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <PauseIcon className="mr-2 h-4 w-4" /> Pause Agent
              </DropdownMenuItem>
              <AgentEditSheet
                agentConfig={createdAgent}
                setUpdatedAgent={setUpdatedAgent}
              >
                <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Agent
                </div>
              </AgentEditSheet>
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
    </div>
  );
}

export default NewAgentCard;