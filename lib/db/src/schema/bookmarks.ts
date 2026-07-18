import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const bookmarksTable = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // "disease" | "drug" | "investigation"
  itemId: text("item_id").notNull(),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
