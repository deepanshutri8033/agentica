import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "agentica",
  name: "Groovi AI Agent Runner",
  isDev: process.env.NODE_ENV === "development",
});
