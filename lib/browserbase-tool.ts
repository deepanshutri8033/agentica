import Browserbase from "@browserbasehq/sdk";
import { tool } from "@openai/agents";
import { resolve } from "path";
import { z } from "zod";

async function researchWithBrowserbase(task: string) {
    const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
    });

    const { runId } = await bb.agents.runs.create({
        agentId: process.env.BROWSERBASE_AGENT_ID,
        task: task,
        browserSettings: { proxies: true },
    });

    const deadline = Date.now() + 4 * 60 * 1000;
    const terminal = ["COMPLETED", "FAILED", "STOPPED", "TIMED_OUT"];
    
    while (Date.now() < deadline) {
        const run = await bb.agents.runs.retrieve(runId);
        
        if (terminal.includes(run.status)) {
            return run;
        }

        // Wait 2 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Browser run out of time');
}

export const browserbaseResearchTool = tool({
    name: 'browser_research',
    description: `Use this tool when the user asks to browse or search compare current product prices, check current availability, or verify information from websites. This is a read-only browser tool.`,
    parameters: z.object({
        task: z.string().min(10).describe('The complete live web search task')
    }),
    async execute({ task }) {
        try {
            const resp = await researchWithBrowserbase(task);
            return JSON.stringify(resp);
        } catch (e) {
            console.error(e);
            return JSON.stringify({ error: String(e) });
        }
    }
});