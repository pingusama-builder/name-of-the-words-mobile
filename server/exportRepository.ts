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
import { createEmptyExportedIdeas, type ExportedIdeas } from "../shared/export";
import { getDb } from "./db";

export type AuthenticatedExportCollections = {
  tags: string[];
  ideas: ExportedIdeas;
};

/**
 * Owns Drizzle schema references and ownership filtering used by the portable
 * export. Callers receive logical export collections, not database tables.
 */
export class ExportRepository {
  async getAuthenticatedCollections(userId: string): Promise<AuthenticatedExportCollections> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database is not available");
    }

    const allTags = await db.select().from(tags);
    const ideas = createEmptyExportedIdeas();

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

    return {
      tags: allTags.map((tag) => tag.name),
      ideas,
    };
  }
}

export const exportRepository = new ExportRepository();
