/**
 * Shared Decks — storage helpers and DB table bootstrap
 *
 * A shared deck is a curated list of word IDs that any user can view via a
 * unique token URL, without requiring authentication.
 *
 * Uses raw mysql2 connections because shared_decks is not in the Drizzle schema.
 */
import { randomBytes } from "crypto";
import mysql from "mysql2/promise";

function getConn(): Promise<mysql.Connection> {
  return mysql.createConnection(process.env.DATABASE_URL!);
}

export interface SharedDeck {
  id: number;
  token: string;
  title: string | null;
  wordIds: string; // JSON array of word IDs
  ownerUserId: string;
  createdAt: string;
}

export interface CreateDeckInput {
  ownerUserId: string;
  wordIds: number[];
  title?: string | null;
}

/** Ensure the shared_decks table exists (idempotent) */
export async function ensureSharedDecksTable(): Promise<void> {
  let conn: mysql.Connection | null = null;
  try {
    conn = await getConn();
    await conn.execute(`CREATE TABLE IF NOT EXISTS shared_decks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(64) NOT NULL UNIQUE,
      title VARCHAR(512),
      word_ids TEXT NOT NULL,
      owner_user_id VARCHAR(128) NOT NULL,
      created_at VARCHAR(64) NOT NULL
    )`);
    console.log("[SharedDecks] Table ensured");
  } catch (e) {
    console.error("[SharedDecks] Failed to ensure table:", e);
  } finally {
    await conn?.end();
  }
}

export const sharedDeckStorage = {
  async createDeck(input: CreateDeckInput): Promise<SharedDeck> {
    const token = randomBytes(20).toString("hex"); // 40-char URL-safe token
    const now = new Date().toISOString();
    let conn: mysql.Connection | null = null;
    try {
      conn = await getConn();
      await conn.execute(
        "INSERT INTO shared_decks (token, title, word_ids, owner_user_id, created_at) VALUES (?, ?, ?, ?, ?)",
        [token, input.title ?? null, JSON.stringify(input.wordIds), input.ownerUserId, now]
      );
    } finally {
      await conn?.end();
    }
    const deck = await this.getDeckByToken(token);
    if (!deck) throw new Error("Failed to retrieve created deck");
    return deck;
  },

  async getDeckByToken(token: string): Promise<SharedDeck | null> {
    let conn: mysql.Connection | null = null;
    try {
      conn = await getConn();
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        "SELECT id, token, title, word_ids AS wordIds, owner_user_id AS ownerUserId, created_at AS createdAt FROM shared_decks WHERE token = ? LIMIT 1",
        [token]
      );
      return (rows[0] as SharedDeck) ?? null;
    } finally {
      await conn?.end();
    }
  },

  async getDecksByOwner(ownerUserId: string): Promise<SharedDeck[]> {
    let conn: mysql.Connection | null = null;
    try {
      conn = await getConn();
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        "SELECT id, token, title, word_ids AS wordIds, owner_user_id AS ownerUserId, created_at AS createdAt FROM shared_decks WHERE owner_user_id = ? ORDER BY created_at DESC",
        [ownerUserId]
      );
      return rows as SharedDeck[];
    } finally {
      await conn?.end();
    }
  },

  async deleteDeck(token: string): Promise<void> {
    let conn: mysql.Connection | null = null;
    try {
      conn = await getConn();
      await conn.execute("DELETE FROM shared_decks WHERE token = ?", [token]);
    } finally {
      await conn?.end();
    }
  },
};
