import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  dispatchUpcomingRuns,
  executeScheduledAgentRun,
} from "@/lib/inngest/functions";

// Next.js Route Handler for Inngest API
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dispatchUpcomingRuns,
    executeScheduledAgentRun,
  ],
});
