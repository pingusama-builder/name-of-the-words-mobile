import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const words = mysqlTable("words", {
  id: int("id").autoincrement().primaryKey(),
  word: varchar("word", { length: 255 }).notNull(),
  originLanguage: varchar("origin_language", { length: 64 }).notNull(), // "cantonese" | "mandarin" | "english" | "other"
  meaning: text("meaning"), // user-defined meaning
  context: text("context"), // sentence context
  ratingEssence: int("rating_essence").default(0), // 0-12 clock positions
  ratingBeauty: int("rating_beauty").default(0),
  ratingSubtlety: int("rating_subtlety").default(0),
  tags: text("tags"), // JSON array of strings - default handled in application layer
  pairedWord: varchar("paired_word", { length: 255 }), // for "perfect match" pairs
  pairedMeaning: text("paired_meaning"),
  dateAdded: varchar("date_added", { length: 32 }).notNull(), // ISO date string YYYY-MM-DD
  createdAt: varchar("created_at", { length: 64 }).notNull(), // ISO datetime
  userId: varchar("user_id", { length: 128 }), // Manus OAuth openId
  color: varchar("color", { length: 16 }), // unique hex color per word e.g. "#a3c4f5"
  source: varchar("source", { length: 512 }), // book title, article, show, etc.
  location: varchar("location", { length: 255 }), // free text: "p. 142", "ch. 3", "第三章", etc.
  locationOrder: int("location_order"), // auto-extracted integer from location for sorting
  isWork: int("is_work").default(0), // 0 = aesthetic mode, 1 = work mode
  sourceMode: varchar("source_mode", { length: 32 }).default("normal"), // "normal" | "work" | "mutual-arising"
});

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
});

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
});

export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
