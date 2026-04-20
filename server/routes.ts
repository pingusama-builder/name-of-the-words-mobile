import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUserFromRequest } from "./_core/auth-helper";
import { sharedDeckStorage } from "./sharedDecks";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Static / aggregate endpoints first ──

  // ── Global stats (public) ──
  app.get("/api/stats", async (_req, res) => {
    try {
      const { createConnection } = await import("mysql2/promise");
      const conn = await createConnection(process.env.DATABASE_URL!);
      // Seekers: distinct real users (those who have signed in = exist in users table, deduped by openId)
      const [userRows] = await conn.execute("SELECT COUNT(DISTINCT openId) AS cnt FROM users") as any[];
      // Words Named: only words owned by a real user (user_id IS NOT NULL)
      const [wordRows] = await conn.execute("SELECT COUNT(*) AS cnt FROM words WHERE user_id IS NOT NULL") as any[];
      await conn.end();
      res.json({
        seekers: Number(userRows[0].cnt),
        wordsNamed: Number(wordRows[0].cnt),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Onboarding seed ──
  // Called once from client after first login; no-ops if user already has words
  app.post("/api/seed", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const existing = await storage.getAllWords(userId);
      if (existing.length > 0) return res.json({ seeded: false, message: "Already has words" });
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();
      const seedWords = [
        {
          word: "Essence",
          originLanguage: "english",
          meaning: "The quality that makes something what it fundamentally is — its irreducible core.",
          context: "Every word you save here is an attempt to name an essence: the precise quality that makes a thing itself and nothing else.",
          ratingEssence: 12,
          ratingBeauty: 8,
          ratingSubtlety: 6,
          tags: JSON.stringify(["guide", "philosophy"]),
          dateAdded: today,
          createdAt: now,
          userId,
          source: "Name of the Words",
          location: "Welcome",
          locationOrder: 1,
        },
        {
          word: "Beauty",
          originLanguage: "english",
          meaning: "A quality that arrests attention and rewards it — in sound, shape, meaning, or feeling.",
          context: "Rate a word's beauty to remember how it felt the first time you heard it. Some words are beautiful because of what they mean; others, simply because of how they sound.",
          ratingEssence: 7,
          ratingBeauty: 12,
          ratingSubtlety: 8,
          tags: JSON.stringify(["guide", "aesthetics"]),
          dateAdded: today,
          createdAt: now,
          userId,
          source: "Name of the Words",
          location: "Welcome",
          locationOrder: 2,
        },
        {
          word: "Subtlety",
          originLanguage: "english",
          meaning: "The art of saying much with little — a quality of restraint that trusts the reader to feel what is not said.",
          context: "A word scores high in subtlety when its meaning arrives sideways, when it implies more than it states. The best words are icebergs.",
          ratingEssence: 8,
          ratingBeauty: 9,
          ratingSubtlety: 12,
          tags: JSON.stringify(["guide", "language"]),
          dateAdded: today,
          createdAt: now,
          userId,
          source: "Name of the Words",
          location: "Welcome",
          locationOrder: 3,
        },
      ];
      for (const w of seedWords) {
        await storage.createWord(w as any);
      }
      res.json({ seeded: true, count: seedWords.length });
    } catch (error: any) {
      console.error("[Seed] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ── Shared decks ──

  // Create a shared deck from a list of word IDs
  app.post("/api/share", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { wordIds, title } = req.body;
      if (!Array.isArray(wordIds) || wordIds.length === 0) {
        return res.status(400).json({ message: "wordIds must be a non-empty array" });
      }
      const deck = await sharedDeckStorage.createDeck({
        ownerUserId: userId,
        wordIds: wordIds.map(Number),
        title: title || null,
      });
      res.status(201).json(deck);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List shared decks owned by the current user
  app.get("/api/share", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const decks = await sharedDeckStorage.getDecksByOwner(userId);
      res.json(decks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public: view a shared deck by token (no auth required)
  app.get("/api/share/:token", async (req, res) => {
    try {
      const deck = await sharedDeckStorage.getDeckByToken(req.params.token);
      if (!deck) return res.status(404).json({ message: "Shared deck not found or has been revoked" });
      // Fetch the actual word objects
      const wordIds: number[] = JSON.parse(deck.wordIds);
      const wordObjects = await Promise.all(
        wordIds.map(id => storage.getWordById(id))
      );
      const words = wordObjects.filter(Boolean);
      res.json({ deck, words });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete (revoke) a shared deck
  app.delete("/api/share/:token", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const deck = await sharedDeckStorage.getDeckByToken(req.params.token);
      if (!deck) return res.status(404).json({ message: "Not found" });
      if (deck.ownerUserId !== userId) return res.status(403).json({ message: "Not authorized" });
      await sharedDeckStorage.deleteDeck(req.params.token);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Batch delete words
  app.post("/api/words/batch-delete", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { wordIds } = req.body;
      if (!Array.isArray(wordIds) || wordIds.length === 0) {
        return res.status(400).json({ message: "wordIds must be a non-empty array" });
      }
      let deleted = 0;
      for (const id of wordIds) {
        const existing = await storage.getWordById(Number(id));
        if (!existing) continue;
        if (existing.userId && existing.userId !== userId) continue; // skip unauthorized
        await storage.deleteWord(Number(id));
        deleted++;
      }
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── User preferences (work mode) ──

  // Get current user's preferences
  app.get("/api/preferences", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { createConnection } = await import("mysql2/promise");
      const conn = await createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        "SELECT work_mode FROM user_preferences WHERE user_id = ?",
        [userId]
      ) as any[];
      await conn.end();
      const workMode = rows.length > 0 ? Boolean(rows[0].work_mode) : false;
      res.json({ workMode });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Set current user's work mode preference
  app.post("/api/preferences", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { workMode } = req.body;
      if (typeof workMode !== "boolean") return res.status(400).json({ message: "workMode must be boolean" });
      const { createConnection } = await import("mysql2/promise");
      const conn = await createConnection(process.env.DATABASE_URL!);
      await conn.execute(
        `INSERT INTO user_preferences (user_id, work_mode) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE work_mode = ?, updated_at = NOW()`,
        [userId, workMode ? 1 : 0, workMode ? 1 : 0]
      );
      await conn.end();
      res.json({ workMode });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Random word (scoped to user + mode)
  app.get("/api/random", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
    const word = await storage.getRandomWord(userId ?? undefined, isWork);
    if (!word) return res.status(404).json({ message: "No words saved yet" });
    res.json(word);
  });

  // Get all tags
  app.get("/api/tags", async (_req, res) => {
    const tags = await storage.getAllTags();
    res.json(tags);
  });

  // Calendar dates (scoped to user + mode)
  app.get("/api/calendar", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
    const dates = await storage.getCalendarDates(userId ?? undefined, isWork);
    res.json(dates);
  });

  // ── Words: specific sub-paths before :id ──

  // Get words by date (scoped to user + mode)
  app.get("/api/words/date/:date", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
    const words = await storage.getWordsByDate(req.params.date, userId ?? undefined, isWork);
    res.json(words);
  });

  // Search words (scoped to user + mode)
  app.get("/api/words/search/:query", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
    const words = await storage.searchWords(req.params.query, userId ?? undefined, isWork);
    res.json(words);
  });

  // Search by tag (scoped to user + mode)
  app.get("/api/words/tag/:tag", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
    const words = await storage.searchWordsByTag(req.params.tag, userId ?? undefined, isWork);
    res.json(words);
  });

  // Get all words (scoped to user + mode)
  app.get("/api/words", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
    const words = await storage.getAllWords(userId ?? undefined, isWork);
    res.json(words);
  });

  // Get a single word (must come AFTER /date, /search, /tag)
  app.get("/api/words/:id", async (req, res) => {
    const word = await storage.getWordById(Number(req.params.id));
    if (!word) return res.status(404).json({ message: "Word not found" });
    res.json(word);
  });

  // Create a word (attach userId)
  app.post("/api/words", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      // Normalise tags: accept array or JSON string
      let tagsArray: string[] = [];
      if (Array.isArray(req.body.tags)) {
        tagsArray = req.body.tags;
      } else if (typeof req.body.tags === "string" && req.body.tags.startsWith("[")) {
        try { tagsArray = JSON.parse(req.body.tags); } catch { tagsArray = []; }
      }
      const wordData = {
        ...req.body,
        userId: userId ?? null,
        tags: JSON.stringify(tagsArray),
        dateAdded: req.body.dateAdded || new Date().toISOString().split("T")[0],
        createdAt: req.body.createdAt || new Date().toISOString(),
        sourceMode: req.body.sourceMode || "normal",
      };
      const word = await storage.createWord(wordData);
      // Ensure every tag exists in the tags table
      for (const tagName of tagsArray) {
        const trimmed = tagName.trim();
        if (trimmed) await storage.createTag({ name: trimmed });
      }
      res.status(201).json(word);
    } catch (error: any) {
      console.error("Error creating word:", error);
      res.status(500).json({ message: error.message || "Failed to create word" });
    }
  });

  // Update a word
  app.put("/api/words/:id", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const id = Number(req.params.id);
      const existing = await storage.getWordById(id);
      if (!existing) return res.status(404).json({ message: "Word not found" });
      // Only allow editing own words (or words with no userId for legacy data)
      if (existing.userId && userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updates = {
        ...req.body,
        tags: Array.isArray(req.body.tags) ? JSON.stringify(req.body.tags) : (req.body.tags || "[]"),
      };
      const updated = await storage.updateWord(id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating word:", error);
      res.status(500).json({ message: error.message || "Failed to update word" });
    }
  });

  // Delete a word
  app.delete("/api/words/:id", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const id = Number(req.params.id);
      const existing = await storage.getWordById(id);
      if (!existing) return res.status(404).json({ message: "Word not found" });
      // Only allow deleting own words
      if (existing.userId && userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteWord(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete word" });
    }
  });

  // Create a tag
  app.post("/api/tags", async (req, res) => {
    try {
      const tag = await storage.createTag({ name: req.body.name });
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create tag" });
    }
  });

  // ── Export / Import ──

  app.get("/api/export/json", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
      const allWords = await storage.getAllWords(userId ?? undefined, isWork);
      const parsed = allWords.map(w => ({
        ...w,
        tags: (() => { try { return JSON.parse(w.tags || "[]"); } catch { return []; } })(),
      }));
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=name-of-the-words.json");
      res.json({ exportedAt: new Date().toISOString(), words: parsed });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/excel", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
      const allWords = await storage.getAllWords(userId ?? undefined, isWork);
      const headers = ["Word", "Language", "Meaning", "Context", "Essence", "Beauty", "Subtlety", "Tags", "Paired Word", "Date Added", "Source", "Location", "Location Order", "Work"];
      const rows = allWords.map(w => [
        w.word, w.originLanguage, w.meaning || "", w.context || "",
        w.ratingEssence || 0, w.ratingBeauty || 0, w.ratingSubtlety || 0,
        (() => { try { return JSON.parse(w.tags || "[]").join(", "); } catch { return ""; } })(),
        w.pairedWord || "", w.dateAdded, w.source || "", w.location || "", w.locationOrder ?? "",
        w.isWork ? "1" : "0",
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=name-of-the-words.csv");
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/json", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const { words: importWords } = req.body;
      if (!Array.isArray(importWords)) return res.status(400).json({ message: "Invalid format" });
      let count = 0;
      for (const w of importWords) {
        // Auto-extract first integer from location for sorting
        const locationOrderMatch = (w.location || "").match(/\d+/);
        const locationOrder = locationOrderMatch ? parseInt(locationOrderMatch[0], 10) : null;
        await storage.createWord({
          word: w.word, originLanguage: w.originLanguage || w.origin_language || "english",
          meaning: w.meaning, context: w.context,
          ratingEssence: w.ratingEssence ?? 0, ratingBeauty: w.ratingBeauty ?? 0, ratingSubtlety: w.ratingSubtlety ?? 0,
          tags: Array.isArray(w.tags) ? JSON.stringify(w.tags) : (w.tags || "[]"),
          pairedWord: w.pairedWord, pairedMeaning: w.pairedMeaning,
          // Prefer the date from the import file; fall back to today in UTC (import is server-side, no browser tz available)
          dateAdded: w.dateAdded || new Date().toISOString().split("T")[0],
          createdAt: w.createdAt || new Date().toISOString(),
          userId: userId ?? null,
          source: w.source || null,
          location: w.location || null,
          locationOrder,
          color: w.color || null,
          isWork: w.isWork ? 1 : 0,
        });
        count++;
      }
      res.json({ imported: count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
