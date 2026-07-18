import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const osceSessionsTable = pgTable("osce_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  caseData: jsonb("case_data").notNull(),
  studentAnswer: text("student_answer"),
  aiFeedback: text("ai_feedback"),
  score: integer("score"),
  maxScore: integer("max_score"),
  specialty: text("specialty").notNull().default("General Medicine"),
  status: text("status").notNull().default("active"), // "active" | "submitted"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
