import { type Word, type InsertWord, words, type Tag, type InsertTag, tags } from "@shared/schema";
import { eq, like, desc, or, and, isNull } from "drizzle-orm";
import { getDb } from "./db";

/** Generate a visually distinct random hex color for a new word */
function generateUniqueColor(): string {
  // Use a wide spread of hues with consistent saturation/lightness for readability
  const hue = Math.floor(Math.random() * 360);
  const saturation = 55 + Math.floor(Math.random() * 25); // 55-80%
  const lightness = 52 + Math.floor(Math.random() * 16);  // 52-68%
  // HSL to hex
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Helper: build a userId filter that includes both the user's words AND legacy words (userId IS NULL)
function userScope(userId?: string) {
  if (!userId) return undefined;
  // Show the user's own words + anonymous legacy words
  return or(eq(words.userId, userId), isNull(words.userId));
}

export interface IStorage {
  getAllWords(userId?: string): Promise<Word[]>;
  getWordById(id: number): Promise<Word | undefined>;
  getWordsByDate(date: string, userId?: string): Promise<Word[]>;
  searchWordsByTag(tag: string, userId?: string): Promise<Word[]>;
  searchWords(query: string, userId?: string): Promise<Word[]>;
  createWord(word: InsertWord): Promise<Word>;
  updateWord(id: number, updates: Partial<InsertWord>): Promise<Word>;
  deleteWord(id: number): Promise<void>;
  getRandomWord(userId?: string): Promise<Word | undefined>;
  getAllTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  getCalendarDates(userId?: string): Promise<{ date: string; count: number; wordIds: number[]; colors: string[] }[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllWords(userId?: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    const scope = userScope(userId);
    const query = db.select().from(words);
    const result = scope
      ? await query.where(scope).orderBy(desc(words.createdAt))
      : await query.orderBy(desc(words.createdAt));
    return result;
  }

  async getWordById(id: number): Promise<Word | undefined> {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(words).where(eq(words.id, id)).limit(1);
    return result[0];
  }

  async getWordsByDate(date: string, userId?: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    const scope = userScope(userId);
    const dateFilter = eq(words.dateAdded, date);
    const condition = scope ? and(dateFilter, scope) : dateFilter;
    return db.select().from(words).where(condition);
  }

  async searchWordsByTag(tag: string, userId?: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    const scope = userScope(userId);
    const all = scope
      ? await db.select().from(words).where(scope)
      : await db.select().from(words);
    return all.filter((w: Word) => {
      try {
        const t = JSON.parse(w.tags || "[]");
        return t.includes(tag);
      } catch { return false; }
    });
  }

  async searchWords(query: string, userId?: string): Promise<Word[]> {
    const db = await getDb();
    if (!db) return [];
    const q = `%${query}%`;
    const textFilter = or(like(words.word, q), like(words.meaning, q), like(words.context, q));
    const scope = userScope(userId);
    const condition = scope ? and(textFilter, scope) : textFilter;
    return db.select().from(words).where(condition);
  }

  async createWord(word: InsertWord): Promise<Word> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // Auto-assign a unique color if not provided
    if (!word.color) {
      word = { ...word, color: generateUniqueColor() };
    }
    const result = await db.insert(words).values(word);
    const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const created = await db.select().from(words).where(eq(words.id, insertId)).limit(1);
    return created[0] as Word;
  }

  async updateWord(id: number, updates: Partial<InsertWord>): Promise<Word> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(words).set(updates).where(eq(words.id, id));
    const updated = await db.select().from(words).where(eq(words.id, id)).limit(1);
    if (!updated[0]) throw new Error("Word not found after update");
    return updated[0] as Word;
  }

  async deleteWord(id: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.delete(words).where(eq(words.id, id));
  }

  async getRandomWord(userId?: string): Promise<Word | undefined> {
    const db = await getDb();
    if (!db) return undefined;
    const scope = userScope(userId);
    const all = scope
      ? await db.select().from(words).where(scope)
      : await db.select().from(words);
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

  async getCalendarDates(userId?: string): Promise<{ date: string; count: number; wordIds: number[]; colors: string[] }[]> {
    const db = await getDb();
    if (!db) return [];
    const scope = userScope(userId);
    const all = scope
      ? await db.select().from(words).where(scope)
      : await db.select().from(words);
    const map = new Map<string, { id: number; color: string | null }[]>();
    for (const w of all) {
      const existing = map.get(w.dateAdded) || [];
      existing.push({ id: w.id, color: w.color });
      map.set(w.dateAdded, existing);
    }
    return Array.from(map.entries()).map(([date, entries]) => ({
      date,
      count: entries.length,
      wordIds: entries.map(e => e.id),
      colors: entries.map(e => e.color || "#5b9bd5"),
    }));
  }
}

export const storage = new DatabaseStorage();
