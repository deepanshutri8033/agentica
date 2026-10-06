"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateAgent from "@/components/custom/agents/createAgent";
import MyAgents from "@/components/custom/agents/MyAgents";

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const templatePrompt = searchParams.get("prompt") || "";

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-3xl px-6 pt-18 pb-16">
        <Tabs defaultValue="create-agent" className="w-full">
          <TabsList>
            <TabsTrigger value="create-agent">Create Agent</TabsTrigger>
            <TabsTrigger value="my-agent">My Agents</TabsTrigger>
          </TabsList>
          <TabsContent value="create-agent">
            <CreateAgent initialPrompt={templatePrompt} />
          </TabsContent>
          <TabsContent value="my-agent">
            <MyAgents />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading agents...</div>}>
      <AgentsPageContent />
    </Suspense>
  );
}