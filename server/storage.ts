import { type Word, type InsertWord, words, type Tag, type InsertTag, tags } from "@shared/schema";
import { eq, like, desc, or } from "drizzle-orm";
import { getDb } from "./db";

export interface IStorage {
  getAllWords(): Promise<Word[]>;
  getWordById(id: number): Promise<Word | undefined>;
  getWordsByDate(date: string): Promise<Word[]>;
  searchWordsByTag(tag: string): Promise<Word[]>;
  searchWords(query: string): Promise<Word[]>;
  createWord(word: InsertWord): Promise<Word>;
  deleteWord(id: number): Promise<void>;
  getRandomWord(): Promise<Word | undefined>;
  getAllTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  getCalendarDates(): Promise<{ date: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllWords(): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(words).orderBy(desc(words.createdAt));
  }

  async getWordById(id: number): Promise<Word | undefined> {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(words).where(eq(words.id, id)).limit(1);
    return result[0];
  }

  async getWordsByDate(date: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(words).where(eq(words.dateAdded, date));
  }

  async searchWordsByTag(tag: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    const all = await db.select().from(words);
    return all.filter((w: Word) => {
      try {
        const t = JSON.parse(w.tags || "[]");
        return t.includes(tag);
      } catch { return false; }
    });
  }

  async searchWords(query: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    const q = `%${query}%`;
    return db.select().from(words).where(
      or(like(words.word, q), like(words.meaning, q), like(words.context, q))
    );
  }

  async createWord(word: InsertWord): Promise<Word> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(words).values(word);
    const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const created = await db.select().from(words).where(eq(words.id, insertId)).limit(1);
    return created[0] as Word;
  }

  async deleteWord(id: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.delete(words).where(eq(words.id, id));
  }

  async getRandomWord(): Promise<Word | undefined> {
    const db = await getDb();
    if (!db) return undefined;
    const all = await db.select().from(words);
    if (all.length === 0) return undefined;
    return all[Math.floor(Math.random() * all.length)];
  }

  async getAllTags(): Promise<Tag[]> {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tags);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(tags).where(eq(tags.name, tag.name)).limit(1);
    if (existing[0]) return existing[0] as Tag;
    const result = await db.insert(tags).values(tag);
    const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const created = await db.select().from(tags).where(eq(tags.id, insertId)).limit(1);
    return created[0] as Tag;
  }

  async getCalendarDates(): Promise<{ date: string; count: number }[]> {
    const db = await getDb();
    if (!db) return [];
    const all = await db.select().from(words);
    const map = new Map<string, number>();
    for (const w of all) {
      map.set(w.dateAdded, (map.get(w.dateAdded) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }
}

export const storage = new DatabaseStorage();
