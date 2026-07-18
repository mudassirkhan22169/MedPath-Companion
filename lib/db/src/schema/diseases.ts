import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const diseasesTable = pgTable("diseases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  icdCode: text("icd_code"),
  description: text("description").notNull(),
  symptoms: text("symptoms").array().notNull().default([]),
  causes: text("causes").array().notNull().default([]),
  riskFactors: text("risk_factors").array().notNull().default([]),
  diagnosis: text("diagnosis").notNull(),
  investigations: text("investigations").array().notNull().default([]),
  treatment: text("treatment").notNull(),
  complications: text("complications").array().notNull().default([]),
  prevention: text("prevention"),
  prognosis: text("prognosis"),
});

export type Disease = typeof diseasesTable.$inferSelect;
