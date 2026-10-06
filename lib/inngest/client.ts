import { Inngest } from "inngest";

// Initialize Inngest Client with local dev mode enabled by default
export const inngest = new Inngest({
  id: "agentica",
  name: "Groovi AI Agent Runner",
  isDev: true,
});
