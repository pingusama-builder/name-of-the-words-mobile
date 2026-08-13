import { eq, inArray } from "drizzle-orm";
import {
  ideaConnections,
  ideaInstances,
  ideaNetworkConnections,
  ideaNetworkPrimaries,
  ideaNetworks,
  ideaPrimaries,
} from "../drizzle/schema";
import { tags } from "../shared/schema";
import {
  createEmptyExportedIdeas,
  type ExportPayload,
  type ExportedWord,
} from "../shared/export";
import { getDb } from "./db";
import { storage } from "./storage";

function parseExportedWords(words: Awaited<ReturnType<typeof storage.getAllWords>>): ExportedWord[] {
  return words.map((word) => ({
    ...word,
    tags: (() => {
      try {
        return JSON.parse(word.tags || "[]");
      } catch {
        return [];
      }
    })(),
  }));
}

/**
 * Builds the portable JSON export payload. This service intentionally owns
 * export-specific data assembly only; HTTP, authentication resolution, and
 * download headers remain in the route layer.
 */
export async function exportUserData(userId: string | undefined, isWork?: boolean): Promise<ExportPayload> {
  const words = await storage.getAllWords(userId, isWork);
  const ideas = createEmptyExportedIdeas();
  let exportedTags: string[] = [];

  if (userId) {
    const db = await getDb();
    if (!db) {
      throw new Error("Database is not available");
    }

    const allTags = await db.select().from(tags);
    exportedTags = allTags.map((tag) => tag.name);

    ideas.primaries = await db.select().from(ideaPrimaries).where(eq(ideaPrimaries.userId, userId));
    ideas.instances = await db.select().from(ideaInstances).where(eq(ideaInstances.userId, userId));
    ideas.connections = await db.select().from(ideaConnections).where(eq(ideaConnections.userId, userId));
    ideas.networks = await db.select().from(ideaNetworks).where(eq(ideaNetworks.userId, userId));
    ideas.networkConnections = await db
      .select()
      .from(ideaNetworkConnections)
      .where(eq(ideaNetworkConnections.userId, userId));

    if (ideas.networks.length > 0) {
      const networkIds = ideas.networks.map((network) => network.id);
      ideas.networkPrimaries = await db
        .select()
        .from(ideaNetworkPrimaries)
        .where(inArray(ideaNetworkPrimaries.networkId, networkIds));
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    words: parseExportedWords(words),
    tags: exportedTags,
    ideas,
  };
}
