import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Static / aggregate endpoints first ──

  // Random word
  app.get("/api/random", async (_req, res) => {
    const word = await storage.getRandomWord();
    if (!word) return res.status(404).json({ message: "No words saved yet" });
    res.json(word);
  });

  // Get all tags
  app.get("/api/tags", async (_req, res) => {
    const tags = await storage.getAllTags();
    res.json(tags);
  });

  // Calendar dates
  app.get("/api/calendar", async (_req, res) => {
    const dates = await storage.getCalendarDates();
    res.json(dates);
  });

  // ── Words: specific sub-paths before :id ──

  // Get words by date
  app.get("/api/words/date/:date", async (req, res) => {
    const words = await storage.getWordsByDate(req.params.date);
    res.json(words);
  });

  // Search words (word + meaning)
  app.get("/api/words/search/:query", async (req, res) => {
    const words = await storage.searchWords(req.params.query);
    res.json(words);
  });

  // Search by tag
  app.get("/api/words/tag/:tag", async (req, res) => {
    const words = await storage.searchWordsByTag(req.params.tag);
    res.json(words);
  });

  // Get all words
  app.get("/api/words", async (_req, res) => {
    const words = await storage.getAllWords();
    res.json(words);
  });

  // Get a single word (must come AFTER /date, /search, /tag)
  app.get("/api/words/:id", async (req, res) => {
    const word = await storage.getWordById(Number(req.params.id));
    if (!word) return res.status(404).json({ message: "Word not found" });
    res.json(word);
  });

  // Create word
  app.post("/api/words", async (req, res) => {
    try {
      const word = await storage.createWord(req.body);
      // Auto-create tags
      if (req.body.tags) {
        try {
          const tagList = JSON.parse(req.body.tags || "[]");
          for (const t of tagList) {
            await storage.createTag({ name: t });
          }
        } catch { /* skip bad JSON */ }
      }
      res.status(201).json(word);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Delete word
  app.delete("/api/words/:id", async (req, res) => {
    await storage.deleteWord(Number(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
