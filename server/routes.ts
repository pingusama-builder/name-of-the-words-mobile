import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUserFromRequest } from "./_core/auth-helper";
import { sharedDeckStorage } from "./sharedDecks";
import { ideaPrimaries, ideaInstances, ideaConnections, ideaNetworks, ideaNetworkPrimaries, ideaNetworkConnections } from "../drizzle/schema";
import { tags } from "../shared/schema";
import { getDb } from "./db";
import { eq, inArray } from "drizzle-orm";

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

  // ── Word collection endpoints ──

  // Get all words (with optional filters)
  app.get("/api/words", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const allWords = await storage.getAllWords(userId ?? undefined, isWork, limit);
      const parsed = allWords.map(w => ({
        ...w,
        tags: (() => { try { return JSON.parse(w.tags || "[]"); } catch { return []; } })(),
      }));
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get words by date
  app.get("/api/words/by-date", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const date = req.query.date as string;
      if (!date) return res.status(400).json({ message: "date query param required" });
      const words = await storage.getWordsByDate(userId ?? undefined, date);
      const parsed = words.map(w => ({
        ...w,
        tags: (() => { try { return JSON.parse(w.tags || "[]"); } catch { return []; } })(),
      }));
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get word by ID
  app.get("/api/words/:id", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const word = await storage.getWord(req.params.id, userId ?? undefined);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const definitions = await storage.getDefinitions(req.params.id);
      const contexts = await storage.getContexts(req.params.id);
      const workEntries = await storage.getWorkEntries(req.params.id);
      res.json({
        ...word,
        tags: (() => { try { return JSON.parse(word.tags || "[]"); } catch { return []; } })(),
        definitions,
        contexts,
        workEntries,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create word
  app.post("/api/words", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.createWord(userId, req.body);
      res.status(201).json(word);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update word
  app.put("/api/words/:id", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.updateWord(req.params.id, userId, req.body);
      if (!word) return res.status(404).json({ message: "Word not found" });
      res.json(word);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete word
  app.delete("/api/words/:id", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const success = await storage.deleteWord(req.params.id, userId);
      if (!success) return res.status(404).json({ message: "Word not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Word definition endpoints ──

  // Add definition
  app.post("/api/words/:id/definitions", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const definition = await storage.addDefinition(req.params.id, req.body.meaning, req.body.partOfSpeech);
      res.status(201).json(definition);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update definition
  app.put("/api/words/:id/definitions/:defId", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const definition = await storage.updateDefinition(req.params.defId, req.body.meaning, req.body.partOfSpeech);
      res.json(definition);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete definition
  app.delete("/api/words/:id/definitions/:defId", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const success = await storage.deleteDefinition(req.params.defId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Word context endpoints ──

  // Add context
  app.post("/api/words/:id/contexts", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const context = await storage.addContext(req.params.id, req.body.context);
      res.status(201).json(context);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update context
  app.put("/api/words/:id/contexts/:ctxId", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const context = await storage.updateContext(req.params.ctxId, req.body.context);
      res.json(context);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete context
  app.delete("/api/words/:id/contexts/:ctxId", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const success = await storage.deleteContext(req.params.ctxId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Work mode endpoints ──

  // Add work entry
  app.post("/api/words/:id/work", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const workEntry = await storage.addWorkEntry(req.params.id, req.body.context);
      res.status(201).json(workEntry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get work entries
  app.get("/api/words/:id/work", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const workEntries = await storage.getWorkEntries(req.params.id);
      res.json(workEntries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete work entry
  app.delete("/api/words/:id/work/:workId", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const word = await storage.getWord(req.params.id, userId);
      if (!word) return res.status(404).json({ message: "Word not found" });
      const success = await storage.deleteWorkEntry(req.params.workId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Mutual arising (pairing) endpoints ──

  // Get mutual arising words
  app.get("/api/mutual-arising", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      const pairs = await storage.getMutualArising(userId ?? undefined);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Tags endpoints ──

  // Get all tags
  app.get("/api/tags", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const tags = await storage.getTags(userId);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create tag
  app.post("/api/tags", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const tag = await storage.createTag(userId, req.body.name);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete tag
  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const success = await storage.deleteTag(req.params.id, userId);
      if (!success) return res.status(404).json({ message: "Tag not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Export / Import ──

  app.get("/api/export/json", async (req, res) => {
    const operationId = `json-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let authenticatedUserResolved = false;

    try {
      const userId = await getUserFromRequest(req);
      authenticatedUserResolved = Boolean(userId);
      const isWork = req.query.isWork === "true" ? true : req.query.isWork === "false" ? false : undefined;
      const allWords = await storage.getAllWords(userId ?? undefined, isWork);
      const parsed = allWords.map(w => ({
        ...w,
        tags: (() => { try { return JSON.parse(w.tags || "[]"); } catch { return []; } })(),
      }));

      // Export tags and ideas if user is authenticated
      let exportedTags: string[] = [];
      let exportedIdeas = {
        primaries: [],
        instances: [],
        connections: [],
        networks: [],
        networkPrimaries: [],
        networkConnections: [],
      };

      if (userId) {
        const db = await getDb();
        if (!db) {
          throw new Error("Database is not available");
        }

        // Export tags
        const allTags = await db.select().from(tags);
        exportedTags = allTags.map(t => t.name);

        // Export idea primaries
        const primaries = await db.select().from(ideaPrimaries).where(eq(ideaPrimaries.userId, userId));
        exportedIdeas.primaries = primaries as any;

        // Export idea instances
        const instances = await db.select().from(ideaInstances).where(eq(ideaInstances.userId, userId));
        exportedIdeas.instances = instances as any;

        // Export idea connections
        const connections = await db.select().from(ideaConnections).where(eq(ideaConnections.userId, userId));
        exportedIdeas.connections = connections as any;

        // Export idea networks
        const networks = await db.select().from(ideaNetworks).where(eq(ideaNetworks.userId, userId));
        exportedIdeas.networks = networks as any;

        // Export network connections
        const networkConnections = await db.select().from(ideaNetworkConnections).where(eq(ideaNetworkConnections.userId, userId));
        exportedIdeas.networkConnections = networkConnections as any;

        // Export network primaries (junction table, no userId column)
        if (networks.length > 0) {
          const networkIds = networks.map(n => n.id);
          const junctions = await db.select().from(ideaNetworkPrimaries).where(inArray(ideaNetworkPrimaries.networkId, networkIds));
          exportedIdeas.networkPrimaries = junctions as any;
        }
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=name-of-the-words.json");
      res.json({
        exportedAt: new Date().toISOString(),
        words: parsed,
        tags: exportedTags,
        ideas: exportedIdeas,
      });
    } catch (error: any) {
      const errorStack = error instanceof Error
        ? error.stack?.split("\n").slice(1, 5).join("\n")
        : undefined;

      console.error("[Export JSON] failed", {
        operationId,
        authenticatedUserResolved,
        errorMessage: error instanceof Error ? error.message : String(error),
        ...(errorStack ? { errorStack } : {}),
      });

      res.status(500).json({
        message: "JSON export failed",
        operationId,
      });
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
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { words } = req.body;
      if (!Array.isArray(words)) return res.status(400).json({ message: "words must be an array" });
      const imported = await Promise.all(words.map(w => storage.createWord(userId, w)));
      res.status(201).json({ imported: imported.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Shared deck endpoints ──

  app.get("/api/shared-decks", async (req, res) => {
    try {
      const decks = await sharedDeckStorage.listDecks();
      res.json(decks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/shared-decks/:id", async (req, res) => {
    try {
      const deck = await sharedDeckStorage.getDeck(req.params.id);
      if (!deck) return res.status(404).json({ message: "Deck not found" });
      res.json(deck);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/shared-decks", async (req, res) => {
    try {
      const userId = await getUserFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const deck = await sharedDeckStorage.createDeck(userId, req.body);
      res.status(201).json(deck);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
