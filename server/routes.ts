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

  // Export words as JSON
  app.get("/api/export/json", async (_req, res) => {
    const words = await storage.getAllWords();
    const tags = await storage.getAllTags();
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      words,
      tags,
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="words-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  });

  // Export words as CSV (Excel compatible)
  app.get("/api/export/excel", async (_req, res) => {
    const words = await storage.getAllWords();
    const headers = ["Word", "Meaning", "Context", "Origin Language", "Tags", "Date Added", "Essence Rating", "Beauty Rating", "Subtlety Rating", "Paired Word", "Paired Meaning"];
    const rows = words.map(w => [
      w.word,
      w.meaning || "",
      w.context || "",
      w.originLanguage,
      w.tags ? JSON.parse(w.tags).join("; ") : "",
      w.dateAdded,
      w.ratingEssence || "",
      w.ratingBeauty || "",
      w.ratingSubtlety || "",
      w.pairedWord || "",
      w.pairedMeaning || "",
    ]);
    
    const csv = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="words-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  });

  // Import words from JSON
  app.post("/api/import/json", async (req, res) => {
    try {
      const { words: importedWords, tags: importedTags } = req.body;
      
      if (!Array.isArray(importedWords)) {
        return res.status(400).json({ message: "Invalid format: words must be an array" });
      }
      
      let createdCount = 0;
      for (const word of importedWords) {
        try {
          await storage.createWord({
            word: word.word,
            originLanguage: word.originLanguage || "other",
            meaning: word.meaning,
            context: word.context,
            ratingEssence: word.ratingEssence,
            ratingBeauty: word.ratingBeauty,
            ratingSubtlety: word.ratingSubtlety,
            tags: word.tags ? JSON.stringify(word.tags) : "[]",
            pairedWord: word.pairedWord,
            pairedMeaning: word.pairedMeaning,
            dateAdded: word.dateAdded || new Date().toISOString().split('T')[0],
            createdAt: word.createdAt || new Date().toISOString(),
          });
          createdCount++;
        } catch (e) {
          console.error("Error importing word:", e);
        }
      }
      
      if (Array.isArray(importedTags)) {
        for (const tag of importedTags) {
          try {
            await storage.createTag({ name: tag.name });
          } catch (e) {
            // Tag might already exist
          }
        }
      }
      
      res.json({ message: `Successfully imported ${createdCount} words`, count: createdCount });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  return httpServer;
}
