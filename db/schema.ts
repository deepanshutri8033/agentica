import {integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  agentCredits:integer('agentCredits').default(3),
  usageCredits:integer('usageCredits').default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),

});


export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
