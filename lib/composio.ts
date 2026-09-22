import {Composio} from "@composio/core"
import {OpenAIAgentsProvider} from"@composio/openai-agents"
import { Agent,run } from "@openai/agents";


export const composio = new Composio({ 
    apiKey:process.env.COMPOSIO_AOI_KEY,
    provider: new OpenAIAgentsProvider()
});