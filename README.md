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
