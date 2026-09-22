"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Loader2, Sparkles, Bot, User, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { CreatedAgentType } from "./createAgent";

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
};

type Props = {
  agent: CreatedAgentType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AgentChatSheet({ agent, open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && agent) {
      setMessages([
        {
          id: `greeting-${agent.agentId || agent.name}`,
          role: "agent",
          content: `Hi! I'm ${agent.name}. Give me a task or ask a question to get started.`,
        },
      ]);
      setInput("");
      setIsAgentReplying(false);
    } else if (!open) {
      setMessages([]);
      setInput("");
    }
  }, [open, agent?.agentId, agent?.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAgentReplying]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isAgentReplying || !agent?.agentId) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsAgentReplying(true);

    try {
      const res = await axios.post("/api/agent/run", {
        agentId: agent.agentId,
        agentConfig: agent,
        input: text,
      });

      const replyContent =
        res.data?.finalOutput ||
        res.data?.output ||
        res.data?.result ||
        "Task completed successfully.";

      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: String(replyContent),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errMsg =
        error.response?.data?.error ||
        "Sorry, I couldn't process your message. Please try again.";

      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: `Error: ${errMsg}`,
        },
      ]);
    } finally {
      setIsAgentReplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full flex flex-col h-full p-0 gap-0 bg-background">
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative flex items-center justify-center rounded-xl bg-muted/40 border shrink-0 overflow-hidden">
              <img
                src={
                  agent?.agentImage ||
                  `https://api.dicebear.com/10.x/micah/svg?seed=${agent?.name || "agent"}`
                }
                alt={agent?.name || "Agent"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-left min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold truncate leading-tight">
                {agent?.name || "AI Agent"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground truncate">
                Chat with your agent and give it a task.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length <= 1 && (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Start a chat with {agent?.name || "your agent"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-[280px] mt-1">
                  {agent?.description ||
                    "Ask questions, provide context, or trigger custom automated tasks."}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl max-w-[80%] whitespace-pre-wrap text-xs sm:text-sm ${
                    isUser
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm"
                      : "bg-muted/70 text-foreground border border-border/50 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                {isUser && (
                  <div className="h-7 w-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isAgentReplying && (
            <div className="flex gap-3 justify-start items-center text-xs text-muted-foreground">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 rounded-2xl border">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-background shrink-0">
          <div className="relative flex items-end border rounded-2xl bg-muted/20 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent?.name || "Agent"}...`}
              className="min-h-[44px] max-h-32 border-0 bg-transparent resize-none p-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              disabled={!input.trim() || isAgentReplying}
              onClick={() => handleSendMessage()}
              className="h-8 w-8 rounded-xl bg-purple-700 hover:bg-purple-800 text-white shrink-0 ml-2 cursor-pointer"
            >
              {isAgentReplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Press <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Shift+Enter</kbd> for a new line
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}