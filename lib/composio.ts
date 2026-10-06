import "server-only";

import {Composio} from "@composio/core"
import {OpenAIAgentsProvider} from"@composio/openai-agents"
import { Agent,run } from "@openai/agents";


export const composio = new Composio({ 
    apiKey: process.env.COMPOSIO_API_KEY,
    provider: new OpenAIAgentsProvider()
});