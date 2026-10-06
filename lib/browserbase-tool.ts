import Browserbase from "@browserbasehq/sdk";
import { tool } from "@openai/agents";
import { z } from "zod";

/**
 * Execute a Browserbase Agent task and poll until completion
 */
export async function executeBrowserbaseTask(task: string): Promise<any> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const agentId = process.env.BROWSERBASE_AGENT_ID;

  if (!apiKey || !agentId) {
    throw new Error(
      "Browserbase configuration missing. Please ensure BROWSERBASE_API_KEY and BROWSERBASE_AGENT_ID are set in .env"
    );
  }

  const bb = new Browserbase({ apiKey });

  const { runId } = await bb.agents.runs.create({
    agentId,
    task,
    browserSettings: { proxies: true },
  });

  const deadline = Date.now() + 4 * 60 * 1000; // 4 minute timeout
  const terminalStatuses = ["COMPLETED", "FAILED", "STOPPED", "TIMED_OUT"];

  while (Date.now() < deadline) {
    const run: any = await bb.agents.runs.retrieve(runId);

    if (terminalStatuses.includes(run.status)) {
      return run;
    }

    // Wait 2 seconds between status polls
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Browserbase task timed out after 4 minutes.");
}

// -----------------------------------------------------------------------------
// FEATURE 1: General Live Web Research Tool
// -----------------------------------------------------------------------------
export const browserbaseResearchTool = tool({
  name: "browser_research",
  description:
    "Use this tool to execute live web searches, browse web pages, gather up-to-date documentation, or find real-time information on the web.",
  parameters: z.object({
    task: z.string().min(10).describe("Detailed web research objective or search prompt"),
  }),
  async execute({ task }) {
    try {
      const run = await executeBrowserbaseTask(task);
      return JSON.stringify({
        success: run.status === "COMPLETED",
        status: run.status,
        result: run.outputs?.[0]?.content || "Web research task completed.",
        sessionUrl: run.logsUrl || null,
      });
    } catch (e: any) {
      console.error("[Browserbase Research Error]:", e);
      return JSON.stringify({ success: false, error: e?.message || String(e) });
    }
  },
});

// -----------------------------------------------------------------------------
// FEATURE 2: Price Comparison & Product Availability Tool
// -----------------------------------------------------------------------------
export const browserbasePriceCompareTool = tool({
  name: "browser_price_compare",
  description:
    "Use this tool to compare prices, check discounts, and verify product or service availability across multiple e-commerce or SaaS websites.",
  parameters: z.object({
    productName: z.string().describe("Name of the product or service to compare"),
    websites: z
      .array(z.string())
      .optional()
      .describe("Optional specific websites or marketplaces to check (e.g. ['Amazon', 'Apple', 'BestBuy'])"),
  }),
  async execute({ productName, websites }) {
    try {
      const sitePrompt = websites?.length
        ? `Target sites: ${websites.join(", ")}.`
        : "Check major marketplaces and official store pages.";
      const task = `Find current prices and availability for "${productName}". ${sitePrompt} Extract pricing, stock availability, and direct product URLs.`;

      const run = await executeBrowserbaseTask(task);
      return JSON.stringify({
        success: run.status === "COMPLETED",
        product: productName,
        status: run.status,
        pricingData: run.outputs?.[0]?.content || "Price comparison completed.",
        sessionUrl: run.logsUrl || null,
      });
    } catch (e: any) {
      console.error("[Browserbase Price Compare Error]:", e);
      return JSON.stringify({ success: false, error: e?.message || String(e) });
    }
  },
});

// -----------------------------------------------------------------------------
// FEATURE 3: Structured Web Data Extraction Tool
// -----------------------------------------------------------------------------
export const browserbaseExtractDataTool = tool({
  name: "browser_extract_data",
  description:
    "Use this tool to navigate to specific web pages and extract structured data, tables, lists, or article content.",
  parameters: z.object({
    url: z.string().describe("Target URL to extract structured data from (must be a valid full URL including https://)"),
    fieldsToExtract: z
      .array(z.string())
      .describe("List of data fields or elements to extract (e.g. ['Title', 'Author', 'Table of Prices'])"),
  }),
  async execute({ url, fieldsToExtract }) {
    try {
      const task = `Navigate to ${url} and extract the following structured data fields: ${fieldsToExtract.join(
        ", "
      )}. Return clean formatted output.`;

      const run = await executeBrowserbaseTask(task);
      return JSON.stringify({
        success: run.status === "COMPLETED",
        targetUrl: url,
        extractedData: run.outputs?.[0]?.content || "Data extraction completed.",
        sessionUrl: run.logsUrl || null,
      });
    } catch (e: any) {
      console.error("[Browserbase Extract Data Error]:", e);
      return JSON.stringify({ success: false, error: e?.message || String(e) });
    }
  },
});

// -----------------------------------------------------------------------------
// FEATURE 4: Source & URL Verification Tool
// -----------------------------------------------------------------------------
export const browserbaseVerifySourcesTool = tool({
  name: "browser_verify_sources",
  description:
    "Use this tool to verify news, statements, or claims against original source websites and return direct URL references.",
  parameters: z.object({
    claim: z.string().min(10).describe("Claim or statement to verify"),
  }),
  async execute({ claim }) {
    try {
      const task = `Verify the accuracy of this claim: "${claim}". Search official news releases, primary documentation, or trusted sources. Return factual confirmation and verified source URLs.`;

      const run = await executeBrowserbaseTask(task);
      return JSON.stringify({
        success: run.status === "COMPLETED",
        claim,
        verificationResult: run.outputs?.[0]?.content || "Source verification completed.",
        sessionUrl: run.logsUrl || null,
      });
    } catch (e: any) {
      console.error("[Browserbase Verify Sources Error]:", e);
      return JSON.stringify({ success: false, error: e?.message || String(e) });
    }
  },
});

// Export all Browserbase tools for easy agent attachment
export const allBrowserbaseTools = [
  browserbaseResearchTool,
  browserbasePriceCompareTool,
  browserbaseExtractDataTool,
  browserbaseVerifySourcesTool,
];