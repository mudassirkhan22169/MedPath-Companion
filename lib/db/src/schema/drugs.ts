import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const drugsTable = pgTable("drugs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genericName: text("generic_name").notNull(),
  brandNames: text("brand_names").array().notNull().default([]),
  drugClass: text("drug_class").notNull(),
  mechanism: text("mechanism").notNull(),
  indications: text("indications").array().notNull().default([]),
  contraindications: text("contraindications").array().notNull().default([]),
  dosage: text("dosage").notNull(),
  sideEffects: text("side_effects").array().notNull().default([]),
  interactions: text("interactions").array().notNull().default([]),
  pregnancy: text("pregnancy"),
  monitoring: text("monitoring"),
});

export type Drug = typeof drugsTable.$inferSelect;
