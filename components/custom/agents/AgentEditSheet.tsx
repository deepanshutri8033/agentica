"use client";

import * as React from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CreatedAgentType } from "./createAgent";

type Props = {
  children: React.ReactNode;
  agentConfig: CreatedAgentType | null;
};

function AgentEditSheet({ children, agentConfig }: Props) {
  return (
    <Sheet>
      <SheetTrigger className="cursor-pointer">{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative flex items-center justify-center rounded-xl bg-muted/40 border shrink-0">
              <Image
                alt="logo"
                src={agentConfig?.agentImage || "/logo.svg"}
                width={32}
                height={32}
                className="object-contain"
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

        <ScrollArea className="flex-1 py-4">
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 border flex items-center justify-center overflow-hidden shrink-0">
                {agentConfig?.agentImage && (
                  <img
                    src={agentConfig.agentImage}
                    alt={agentConfig.name || "Agent"}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold">{agentConfig?.name}</h4>
                <p className="text-xs text-muted-foreground">{agentConfig?.objective}</p>
              </div>
            </div>
          </section>
        </ScrollArea>

        <SheetFooter className="border-t pt-4">
          <div className="flex justify-end gap-2.5 w-full">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-purple-700 hover:bg-purple-800 text-white">
              Save Changes
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AgentEditSheet;