import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------
// Users Table
// ---------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  agentCredits: integer("agentCredits").default(3),
  usageCredits: integer("usageCredits").default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------
// Tools Registry Table
// ---------------------------------------------
export const tools = pgTable("tools", {
  id: uuid("id").defaultRandom().primaryKey(),

  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),

  category: varchar("category", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),

  icon: varchar("icon", { length: 100 }),

  status: varchar("status", { length: 50 }).default("active"),

  requiresAuth: boolean("requires_auth").default(false),
  authType: varchar("auth_type", { length: 50 }),
  authProvider: varchar("auth_provider", { length: 100 }),

  capabilities: jsonb("capabilities").$type<string[]>().default([]),
  useCases: jsonb("use_cases").$type<string[]>().default([]),

  permissions: jsonb("permissions").$type<string[]>().default([]),

  approvalRules: jsonb("approval_rules").$type<Record<string, boolean>>(),

  config: jsonb("config").$type<Record<string, any>>(),

  riskLevel: varchar("risk_level", { length: 30 }).default("low"),

  canRead: boolean("can_read").default(false),
  canWrite: boolean("can_write").default(false),
  canDelete: boolean("can_delete").default(false),
  canExecute: boolean("can_execute").default(true),

  enabled: boolean("enabled").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------
// Agent Config Table
// ---------------------------------------------
export const AgentConfig = pgTable("agentConfig", {
  id: serial("id").primaryKey(),
  userEmail: text("userEmail").references(() => users.email),
  agentId: varchar("agentId").notNull().unique(),
  name: varchar("name"),
  agentImage: varchar("agentImage"),
  description: text("description"),
  instructions: text("instructions"),
  objective: text("objective"),
  tools: jsonb("tools").$type<string[]>(),
  skills: jsonb("skills").$type<string[]>(),
  schedule: jsonb("schedule").$type<{
    type?: string;
    frequency?: string;
    time?: string;
  }>(),
  status: varchar("status", { length: 50 }).default("active"), // active, pause
  outputFormat: text("outputFormat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------
// Inferred TypeScript Types
// ---------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;

export type AgentConfigType = typeof AgentConfig.$inferSelect;
export type NewAgentConfigType = typeof AgentConfig.$inferInsert;