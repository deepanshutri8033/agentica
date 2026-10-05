# 🤖 Agentica — Autonomous AI Agent Platform

> A full-stack, event-driven AI agent orchestration platform designed to automate web research, execute multi-tool workflows, and manage third-party integrations with enterprise-grade safety.

![Agentica Architecture](https://raw.githubusercontent.com/your-username/your-repo/main/public/architecture-banner.png)

---

## 🌟 Overview

**Agentica** is a scalable agentic workflow engine that bridges large language models (LLMs) with real-world tools and live web access. It enables users to configure, schedule, and execute autonomous AI agents capable of web browsing, OAuth-based API operations, and structured data extraction.

---

## ✨ Key Features

- ⚙️ **Dynamic Agent Configuration:** Interactive UI (`AgentEditSheet`) to customize agent identities, execution schedules, system instructions, and tool sets.
- 🌐 **Live Web Browsing & Extraction:** Integrated with **Browserbase** for sandboxed, read-only headless web browsing and anti-bot bypass.
- 🔗 **Third-Party Tool Suite:** Powered by **Composio** to handle OAuth and API connections for tools like Gmail, Tavily, and SerpAPI.
- ⚡ **Event-Driven Execution Engine:** Built on **Inngest** for reliable background job execution, retries, polling, and scheduled tasks.
- 🛡️ **Safety & Injection Guardrails:** Built-in read-only system prompts to prevent prompt injection and unauthorized account actions during web automation.
- 🗄️ **Type-Safe Database Layer:** Powered by **Drizzle ORM** with PostgreSQL for seamless schema management and high-performance queries.

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui, Lucide Icons |
| **Backend & Workflows** | Next.js API Routes, Inngest (Event Queue & Cron Engine) |
| **AI & Automation** | OpenAI API, Composio (Tooling & OAuth), Browserbase (Headless Browser) |
| **Database & ORM** | PostgreSQL, Drizzle ORM, Drizzle Kit |
| **Language** | TypeScript (100% Strict Type Coverage) |

---

## 🏗️ Application Architecture

```text
[ User Interface ] ──► [ Agent Setup / Edit Sheet ]
                              │
                              ▼
                       [ Drizzle ORM ] ◄──► [ PostgreSQL ]
                              │
                              ▼
                       [ Inngest Queue ]
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   [ Composio Toolset ]               [ Browserbase Engine ]
  (Gmail, Tavily, OAuth)             (Read-Only Web Scraper)
             │                                 │
             └────────────────┬────────────────┘
                              ▼
                     [ LLM Reasoning ]
                              │
                              ▼
                     [ Structured Output ]

🚀 Quick Start
Prerequisites
Node.js: v18+

Package Manager: npm or pnpm

PostgreSQL Database

1. Clone & Install
Bash
git clone [https://github.com/your-username/agentica.git](https://github.com/your-username/agentica.git)
cd agentica
npm install
2. Environment Variables
Create a .env.local file in the root directory:

Code snippet
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agentica"

# AI & Tools
OPENAI_API_KEY="your_openai_api_key"
COMPOSIO_API_KEY="your_composio_api_key"
BROWSERBASE_API_KEY="your_browserbase_api_key"
BROWSERBASE_PROJECT_ID="your_browserbase_project_id"

# Inngest Workflow
INNGEST_EVENT_KEY="your_inngest_event_key"
INNGEST_SIGNING_KEY="your_inngest_signing_key"
3. Run Database Migrations
Bash
# Push schema directly (Development)
npm run db:push

# Generate and apply migrations (Production)
npm run db:generate
npm run db:migrate
4. Start Development Server
Run the Next.js development server along with the Inngest CLI:

Bash
# Terminal 1: Web App
npm run dev

# Terminal 2: Inngest Dev Server
npx inngest-cli@latest dev
Open http://localhost:3000 to view the application.

📜 Available Scripts
In the project directory, you can run:

npm run dev — Launches the Next.js development server.

npm run build — Builds the application for production.

npm run db:push — Syncs Drizzle schema directly with the database.

npm run db:studio — Opens Drizzle Studio to view database tables visually.

👤 Author
Deepanshu Tripathi

GitHub: @your-github

LinkedIn: Deepanshu Tripathi
