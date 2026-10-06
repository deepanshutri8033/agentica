"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  Sparkles,
  ArrowRight,
  Bot,
  Play,
  CheckCircle2,
  Zap,
  CalendarClock,
  Blocks,
  ShieldCheck,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { isSignedIn, user } = useUser();

  return (
    <div className="min-h-screen bg-[#fbfcfd] text-slate-900 relative overflow-hidden font-sans">
      {/* Background Grid Lines Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Agentica</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#integrations" className="hover:text-slate-900 transition-colors">
              Integrations
            </a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">
              Architecture
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 gap-1.5 shadow-xs">
                    Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <UserButton />
              </div>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" className="text-xs font-semibold h-9 px-3 text-slate-700">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 gap-1.5 shadow-xs">
                    Get Started <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-6 space-y-8">
            {/* Mint Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Agentic automation for everyday operations</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              Agentica keeps your agents moving while you work.
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              Create AI agents that use tools, follow schedules, run repeatable tasks, and report
              back with the signal your team needs.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/agents">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl h-11 px-6 text-sm gap-2 shadow-sm cursor-pointer">
                  Manage agents <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl h-11 px-6 text-sm cursor-pointer"
                >
                  View runs
                </Button>
              </Link>
            </div>

            {/* 3 Metric Stat Cards */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <p className="text-2xl font-black text-slate-900">3x</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">faster handoffs</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <p className="text-2xl font-black text-slate-900">24/7</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">scheduled runs</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <p className="text-2xl font-black text-slate-900">100</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">starter credits</p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Mockup Box */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden">
              {/* Dark Header Bar */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold tracking-wide">Agent command</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-300 font-medium">Live</span>
                </div>
              </div>

              {/* Inner Dashboard Mockup Grid */}
              <div className="grid grid-cols-12 min-h-[380px]">
                {/* Left Mini Sidebar */}
                <div className="col-span-4 bg-slate-50/80 border-r border-slate-200/60 p-4 space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-100">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Dashboard
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Agents
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-100">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Runs
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-100">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Integrations
                  </div>
                </div>

                {/* Right Main Area */}
                <div className="col-span-8 p-5 space-y-4 bg-white">
                  {/* Briefing Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Today's briefing</p>
                      <h4 className="text-base font-bold text-slate-900">3 agents ready to run</h4>
                    </div>
                    <Button size="sm" className="h-8 text-xs bg-slate-900 text-white rounded-lg gap-1">
                      <Play className="h-3 w-3 fill-white" /> Run now
                    </Button>
                  </div>

                  {/* Agent Cards Stack */}
                  <div className="space-y-2.5">
                    {/* Item 1 */}
                    <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-white border flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Inbox Scout</p>
                          <p className="text-[11px] text-slate-500">Summarize investor replies</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                        Running
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-white border flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Pipeline Minder</p>
                          <p className="text-[11px] text-slate-500">Sync warm leads to CRM</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                        Scheduled
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-white border flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Market Pulse</p>
                          <p className="text-[11px] text-slate-500">Send Monday briefing</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Ready
                      </span>
                    </div>
                  </div>

                  {/* Bottom Stats Pills */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Completed
                      </div>
                      <span className="font-bold text-sm text-emerald-900">18</span>
                    </div>

                    <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-sky-800 font-semibold">
                        <Zap className="h-3.5 w-3.5 text-sky-600" /> Running
                      </div>
                      <span className="font-bold text-sm text-sky-900">2</span>
                    </div>

                    <div className="bg-purple-50/80 border border-purple-100 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-purple-800 font-semibold">
                        <CalendarClock className="h-3.5 w-3.5 text-purple-600" /> Scheduled
                      </div>
                      <span className="font-bold text-sm text-purple-900">9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="text-xs font-semibold border-slate-300 mb-3">
            Core Features
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Everything your team needs to automate workflows
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Interactive Clarification Flow</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              AI asks 2 targeted clarification questions before finalizing your agent prompts and output definitions.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Durable Inngest Scheduling</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              PostgreSQL stores recurring schedules, while Inngest queues runs reliably without server timeouts.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Blocks className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Composio & Browserbase Tools</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect Slack, Gmail, Notion, GitHub, and live Browserbase browser research directly to your agents.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-slate-700" />
            <span className="font-bold text-slate-900">Agentica Platform</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
