import { type Word, type InsertWord, words, type Tag, type InsertTag, tags } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, like, desc, or } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

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
    return db.select().from(words).orderBy(desc(words.createdAt)).all();
  }

  async getWordById(id: number): Promise<Word | undefined> {
    return db.select().from(words).where(eq(words.id, id)).get();
  }

  async getWordsByDate(date: string): Promise<Word[]> {
    return db.select().from(words).where(eq(words.dateAdded, date)).all();
  }

  async searchWordsByTag(tag: string): Promise<Word[]> {
    return db.select().from(words).all().then(all =>
      all.filter(w => {
        try {
          const t = JSON.parse(w.tags || "[]");
          return t.includes(tag);
        } catch { return false; }
      })
    );
  }

  async searchWords(query: string): Promise<Word[]> {
    const q = `%${query}%`;
    return db.select().from(words).where(
      or(like(words.word, q), like(words.meaning, q), like(words.context, q))
    ).all();
  }

  async createWord(word: InsertWord): Promise<Word> {
    const result = db.insert(words).values(word).run();
    return db.select().from(words).where(eq(words.id, result.lastInsertRowid as number)).get() as Word;
  }

  async deleteWord(id: number): Promise<void> {
    db.delete(words).where(eq(words.id, id)).run();
  }

  async getRandomWord(): Promise<Word | undefined> {
    const all = db.select().from(words).all();
    if (all.length === 0) return undefined;
    return all[Math.floor(Math.random() * all.length)];
  }

  async getAllTags(): Promise<Tag[]> {
    return db.select().from(tags).all();
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const existing = db.select().from(tags).where(eq(tags.name, tag.name)).get();
    if (existing) return existing as Tag;
    const result = db.insert(tags).values(tag).run();
    return db.select().from(tags).where(eq(tags.id, result.lastInsertRowid as number)).get() as Tag;
  }

  async getCalendarDates(): Promise<{ date: string; count: number }[]> {
    const all = db.select().from(words).all();
    const map = new Map<string, number>();
    for (const w of all) {
      map.set(w.dateAdded, (map.get(w.dateAdded) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }
}

export const storage = new DatabaseStorage();
