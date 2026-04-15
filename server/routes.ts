import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUserFromRequest } from "./_core/auth-helper";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Static / aggregate endpoints first ──

  // Random word (scoped to user)
  app.get("/api/random", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const word = await storage.getRandomWord(userId ?? undefined);
    if (!word) return res.status(404).json({ message: "No words saved yet" });
    res.json(word);
  });

  // Get all tags
  app.get("/api/tags", async (_req, res) => {
    const tags = await storage.getAllTags();
    res.json(tags);
  });

  // Calendar dates (scoped to user)
  app.get("/api/calendar", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const dates = await storage.getCalendarDates(userId ?? undefined);
    res.json(dates);
  });

  // ── Words: specific sub-paths before :id ──

  // Get words by date (scoped to user)
  app.get("/api/words/date/:date", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const words = await storage.getWordsByDate(req.params.date, userId ?? undefined);
    res.json(words);
  });

  // Search words (scoped to user)
  app.get("/api/words/search/:query", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const words = await storage.searchWords(req.params.query, userId ?? undefined);
    res.json(words);
  });

  // Search by tag (scoped to user)
  app.get("/api/words/tag/:tag", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const words = await storage.searchWordsByTag(req.params.tag, userId ?? undefined);
    res.json(words);
  });

  // Get all words (scoped to user)
  app.get("/api/words", async (req, res) => {
    const userId = await getUserFromRequest(req);
    const words = await storage.getAllWords(userId ?? undefined);
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
      const wordData = {
        ...req.body,
        userId: userId ?? null,
        tags: Array.isArray(req.body.tags) ? JSON.stringify(req.body.tags) : (req.body.tags || "[]"),
        dateAdded: req.body.dateAdded || new Date().toISOString().split("T")[0],
        createdAt: req.body.createdAt || new Date().toISOString(),
      };
      const word = await storage.createWord(wordData);
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
      await storage.deleteWord(Number(req.params.id));
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
      const allWords = await storage.getAllWords(userId ?? undefined);
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
      const allWords = await storage.getAllWords(userId ?? undefined);
      const headers = ["Word", "Language", "Meaning", "Context", "Essence", "Beauty", "Subtlety", "Tags", "Paired Word", "Date Added"];
      const rows = allWords.map(w => [
        w.word, w.originLanguage, w.meaning || "", w.context || "",
        w.ratingEssence || 0, w.ratingBeauty || 0, w.ratingSubtlety || 0,
        (() => { try { return JSON.parse(w.tags || "[]").join(", "); } catch { return ""; } })(),
        w.pairedWord || "", w.dateAdded,
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
        await storage.createWord({
          word: w.word, originLanguage: w.originLanguage || w.origin_language || "english",
          meaning: w.meaning, context: w.context,
          ratingEssence: w.ratingEssence ?? 0, ratingBeauty: w.ratingBeauty ?? 0, ratingSubtlety: w.ratingSubtlety ?? 0,
          tags: Array.isArray(w.tags) ? JSON.stringify(w.tags) : (w.tags || "[]"),
          pairedWord: w.pairedWord, pairedMeaning: w.pairedMeaning,
          dateAdded: w.dateAdded || new Date().toISOString().split("T")[0],
          createdAt: w.createdAt || new Date().toISOString(),
          userId: userId ?? null,
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
