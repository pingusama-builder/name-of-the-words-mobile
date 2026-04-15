import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const words = sqliteTable("words", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  word: text("word").notNull(),
  originLanguage: text("origin_language").notNull(), // "cantonese" | "mandarin" | "english" | "other"
  meaning: text("meaning"), // user-defined meaning
  context: text("context"), // sentence context
  ratingEssence: integer("rating_essence").default(0), // 0-12 clock positions
  ratingBeauty: integer("rating_beauty").default(0),
  ratingSubtlety: integer("rating_subtlety").default(0),
  tags: text("tags").default("[]"), // JSON array of strings
  pairedWord: text("paired_word"), // for "perfect match" pairs
  pairedMeaning: text("paired_meaning"),
  dateAdded: text("date_added").notNull(), // ISO date string YYYY-MM-DD
  createdAt: text("created_at").notNull(), // ISO datetime
});

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
});

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
