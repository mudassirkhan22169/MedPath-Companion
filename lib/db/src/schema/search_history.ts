import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const searchHistoryTable = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  query: text("query").notNull(),
  type: text("type").notNull().default("ai"), // "ai" | "disease" | "drug" | "investigation"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
