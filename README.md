# Agentica

Agentica is a web application for creating AI agents, connecting them to external services, chatting with them, and running tasks manually or on a schedule. Agents and run records are stored in PostgreSQL; Clerk provides sign-in, Composio provides connected-account tools, and Inngest dispatches scheduled work.

## Features

- **Agent creation:** Describe a task and the agent builder asks follow-up questions before generating an agent name, description, instructions, objective, tools, and schedule.
- **Agent management:** View, edit, pause/resume, and delete your agents. Changes are scoped to the signed-in user's agents.
- **Agent chat:** Give an agent a task or ask a question. The current chat's preceding messages are included as context for later messages in that chat.
- **Manual runs:** Trigger an agent immediately using its saved objective/instructions or send a one-off prompt through chat.
- **Scheduled runs:** Schedule one-time or recurring work (hourly, daily, weekly, or monthly), or leave an agent manual-only. Schedule times are interpreted in the timezone selected by the user's browser. Runs are recorded with scheduled, queued, running, completed, failed, or cancelled statuses.
- **Run history:** Review recent run statuses, results, inputs, and errors in the dashboard and Runs page.
- **Integrations:** Connect services through Composio's OAuth flow. The integration page lists Gmail, Slack, Notion, GitHub, Google Calendar, Google Sheets, Linear, and Trello. What an agent can do depends on connected accounts and the tools returned by Composio.
- **Browser automation:** Optional Browserbase tools support live web research, price/availability comparisons, structured page extraction, and related browser tasks.
- **Templates:** Start agent creation with example prompts for email digests, GitHub summaries, calendar briefings, Slack updates, web monitoring, and other workflows.
- **Account pages:** The dashboard includes an overview, profile, integrations, templates, runs, and settings pages.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/sign-in` and `/sign-up` | Clerk authentication |
| `/dashboard` | Overview of agents and recent runs |
| `/dashboard/agents` | Create, chat with, run, and manage agents |
| `/dashboard/runs` | Inspect recent agent runs and their results |
| `/dashboard/integrations` | Connect or disconnect integrations |
| `/dashboard/templates` | Browse example agent prompts |
| `/dashboard/profile` | View database-backed profile and credit fields |
| `/dashboard/settings` | Notification and plan preference UI |

## Technology

- Next.js App Router and React
- TypeScript and Tailwind CSS
- Clerk authentication
- PostgreSQL (Neon-compatible) and Drizzle ORM
- Gemini or OpenAI for agent execution
- Gemini for agent configuration generation
- Composio for connected service accounts and tools
- Browserbase for optional browser automation
- Inngest for scheduled background runs

## Requirements

- Node.js 20 or later
- npm
- A PostgreSQL database
- Clerk application credentials
- Gemini API key for agent configuration generation and, by default, agent execution
- Composio API key to connect external services
- Inngest Dev Server for local scheduled-run delivery

OpenAI and Browserbase are optional depending on the provider and tools you intend to use.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the credentials you need:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Configure the required variables described below. Do not commit `.env.local` or put real keys in this README.

3. Push the Drizzle schema to your development database:

   ```bash
   npm run db:push
   ```

4. Start the web application:

   ```bash
   npm run dev
   ```

5. To run scheduled jobs locally, start the Inngest Dev Server in a second terminal:

   ```bash
   npm run inngest:dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

`npm run dev` by itself starts the web app but does not run the Inngest scheduler. Manual runs can be started without the scheduler.

## Environment variables

| Variable | Required? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public application URL, such as `http://localhost:3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk browser authentication |
| `CLERK_SECRET_KEY` | Yes | Clerk server authentication |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Recommended | Usually `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Recommended | Usually `/sign-up` |
| `GEMINI_API_KEY` | Yes for agent creation; also the default execution provider | Gemini API access |
| `AGENT_MODEL_PROVIDER` | Optional | Set to `gemini` or `openai`; defaults to Gemini when `GEMINI_API_KEY` is present, otherwise OpenAI |
| `GEMINI_AGENT_MODEL` | Optional | Primary Gemini execution model |
| `GEMINI_AGENT_FALLBACK_MODELS` | Optional | Comma-separated Gemini fallback models |
| `OPENAI_API_KEY` | Required if using OpenAI for execution | OpenAI API access |
| `OPENAI_MODEL` | Optional if using OpenAI | OpenAI model name |
| `COMPOSIO_API_KEY` | Required for Composio integrations | Composio API access |
| `BROWSERBASE_API_KEY` | Required for Browserbase tools | Browserbase API access |
| `BROWSERBASE_AGENT_ID` | Required for Browserbase tools | Browserbase agent to execute |
| `INNGEST_EVENT_KEY` | Production Inngest | Inngest event signing/sending |
| `INNGEST_SIGNING_KEY` | Production Inngest | Inngest endpoint verification |

The `.env.example` file is the reference list for the current project. Only enable optional services you plan to use. Gemini quota and rate limits are controlled by the Google project; model fallbacks cannot bypass an exhausted project-wide quota.

## Scheduling and production

The Inngest function endpoint is `/api/inngest`. In local development, run `npm run inngest:dev` alongside Next.js and register the local app endpoint in the Inngest Dev Server if prompted. In production, set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in the deployment environment and register the deployed `/api/inngest` endpoint with Inngest.

The dispatcher checks for due runs every minute. A scheduled run requires the app/database and Inngest endpoint to be available. A manual-only schedule does not create recurring scheduled runs.

## Database commands

```bash
npm run db:push       # Apply the current Drizzle schema directly (development)
npm run db:generate   # Generate Drizzle migration files
npm run db:studio     # Open Drizzle Studio
```

`db:generate` generates migration files; this project does not currently define a migration-apply npm script.

## Other scripts

```bash
npm run build         # Create a production build
npm run start         # Run the production build
npm run lint          # Run the configured Next.js lint command
```

## Data and current limitations

- Agent configuration and agent run records are stored in PostgreSQL. User authentication is managed by Clerk.
- Chat messages are held in the browser while the chat sheet is open and sent as context with later turns; conversation history is not currently persisted as a separate database record.
- Integration availability depends on Composio configuration, the user's successful connection, and the tools exposed for that connected account. Some tools require an API key configured in Composio rather than an OAuth connection.
- Agent execution requires a working model provider and available provider quota. Temporary provider outages or exhausted quotas can cause a run to fail.
- The notification switches and plan/credit display on the Settings page are currently presentation-only; saving those switches does not persist notification preferences or send email notifications.
- Scheduled execution requires Inngest to be running and configured. Creating a schedule in the database alone does not run jobs.

## Project structure

```text
app/
  api/                 API routes for agents, runs, integrations, and users
  dashboard/           Dashboard pages
components/
  custom/              Agent, dashboard, and integration UI
db/
  schema.ts            Drizzle PostgreSQL schema
lib/
  inngest/             Scheduled-run dispatcher and worker
  build-agent.ts       Model selection and agent/tool construction
  execute-agent.ts     Agent execution and chat context handling
```
