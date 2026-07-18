import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const investigationsTable = pgTable("lab_investigations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  category: text("category").notNull(),
  normalRange: text("normal_range").notNull(),
  units: text("units"),
  interpretation: text("interpretation").notNull(),
  significance: text("significance").notNull(),
  relatedConditions: text("related_conditions").array().notNull().default([]),
});

export type Investigation = typeof investigationsTable.$inferSelect;
