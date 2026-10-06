"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntegrationTool {
  slug: string;
  name: string;
  description: string;
  category: string;
  iconBg: string;
  logo: string;
}

const INTEGRATIONS_LIST: IntegrationTool[] = [
  {
    slug: "gmail",
    name: "Gmail",
    description: "Search, read, draft and send Gmail messages.",
    category: "Communication",
    iconBg: "bg-red-50 text-red-600 border-red-100",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Read channels, search messages and send Slack messages.",
    category: "Communication",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
  },
  {
    slug: "notion",
    name: "Notion",
    description: "Search, read and update pages and databases in Notion.",
    category: "Productivity",
    iconBg: "bg-slate-50 text-slate-900 border-slate-200",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg",
  },
  {
    slug: "github",
    name: "GitHub",
    description: "Read repositories, issues and pull requests and perform repository actions.",
    category: "Developer",
    iconBg: "bg-zinc-900 text-white border-zinc-700",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
  },
  {
    slug: "googlecalendar",
    name: "Google Calendar",
    description: "Read calendar events, check availability, create meetings and manage schedules.",
    category: "Calendar",
    iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
  },
  {
    slug: "googlesheets",
    name: "Google Sheets",
    description: "Read and update spreadsheets, format rows, and append real-time data.",
    category: "Productivity",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg",
  },
  {
    slug: "linear",
    name: "Linear",
    description: "Create issues, track projects, and manage engineering team tasks.",
    category: "Project Management",
    iconBg: "bg-purple-50 text-purple-600 border-purple-100",
    logo: "https://asset.brandfetch.io/id_g_Y7974/id9o7F3f_R.svg",
  },
  {
    slug: "trello",
    name: "Trello",
    description: "Manage boards, update cards, and track project workflows seamlessly.",
    category: "Project Management",
    iconBg: "bg-sky-50 text-sky-600 border-sky-100",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Trello-logo-blue.svg",
  },
];

export default function IntegrationsPage() {
  const [connectedSlugs, setConnectedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchIntegrations = useCallback(async (): Promise<Set<string> | null> => {
    try {
      setLoading(true);
      const res = await axios.get("/api/integrations");
      const slugs = new Set<string>(
        (res.data?.connectedSlugs || []).map((slug: string) => slug.toLowerCase())
      );
      setConnectedSlugs(slugs);
      return slugs;
    } catch (error) {
      console.error("Failed to load integrations status:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
    return () => {
      if (popupTimerRef.current) clearInterval(popupTimerRef.current);
    };
  }, [fetchIntegrations]);

  const handleConnect = async (tool: IntegrationTool) => {
    let popup: Window | null = null;

    try {
      setActiveSlug(tool.slug);
      toast.info(`Initiating connection for ${tool.name}...`);

      popup = window.open(
        "about:blank",
        "ComposioAuthPopup",
        "width=600,height=750"
      );
      if (!popup) {
        toast.error("Allow popups for this site to connect an integration.");
        setActiveSlug(null);
        return;
      }

      const res = await axios.post("/api/agent/tools/connect", {
        toolSlug: tool.slug,
      });

      if (!res.data?.redirectUrl) {
        throw new Error("No authorization URL was returned.");
      }

      popup.location.href = res.data.redirectUrl;

      if (popupTimerRef.current) clearInterval(popupTimerRef.current);
      popupTimerRef.current = setInterval(() => {
        if (!popup?.closed) return;

        if (popupTimerRef.current) clearInterval(popupTimerRef.current);
        popupTimerRef.current = null;
        setActiveSlug(null);

        void (async () => {
          for (let attempt = 0; attempt < 5; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const slugs = await fetchIntegrations();
            if (slugs?.has(tool.slug)) {
              toast.success(`${tool.name} connected successfully.`);
              return;
            }
          }
          toast.info(`We couldn't confirm ${tool.name} yet. Refresh status to check.`);
        })();
      }, 1000);
    } catch (error: any) {
      popup?.close();
      console.error("Connect error:", error);
      toast.error(error.response?.data?.error || "Couldn't connect this integration. Please try again.");
      setActiveSlug(null);
    } finally {
      if (!popup || popup.closed) setActiveSlug(null);
    }
  };

  const handleDisconnect = async (tool: IntegrationTool) => {
    try {
      setActiveSlug(tool.slug);
      toast.info(`Disconnecting ${tool.name}...`);

      await axios.delete("/api/agent/tools/connect", {
        data: {
          toolSlug: tool.slug,
        },
      });

      const slugs = await fetchIntegrations();
      if (slugs && !slugs.has(tool.slug)) {
        toast.success(`${tool.name} disconnected.`);
      } else {
        toast.info(`${tool.name} disconnect was requested, but its status hasn't updated yet.`);
      }
    } catch (err: any) {
      console.error("Disconnect error:", err);
      toast.error(err.response?.data?.error || "Failed to disconnect integration");
    } finally {
      setActiveSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Integrations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect the tools your agents need to get work done.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchIntegrations}
          disabled={loading}
          className="gap-2 text-xs rounded-xl"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {INTEGRATIONS_LIST.map((tool) => {
          const isConnected = connectedSlugs.has(tool.slug);
          const isProcessing = activeSlug === tool.slug;

          return (
            <div
              key={tool.slug}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between gap-5 shadow-sm hover:border-slate-300 transition-all"
            >
              <div className="space-y-3">
                {/* Top Row: Logo & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 overflow-hidden shadow-xs">
                    <img
                      src={tool.logo}
                      alt={tool.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        // Fallback text if image fails to load
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Not Connected
                    </span>
                  )}
                </div>

                {/* Name & Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tool.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {isConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => handleDisconnect(tool)}
                  className="w-full h-10 rounded-xl text-xs font-medium border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleConnect(tool)}
                  className="w-full h-10 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
