/**
 * Ideas Mode Storage Layer
 * Implements all CRUD operations for Primary Ideas, Instances, Connections, and Networks
 * with user isolation, data integrity, and all critical fixes applied.
 */

import { eq, and, or, inArray, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  ideaPrimaries,
  ideaInstances,
  ideaConnections,
  ideaNetworks,
  ideaNetworkPrimaries,
  type IdeaPrimary,
  type InsertIdeaPrimary,
  type IdeaInstance,
  type InsertIdeaInstance,
  type IdeaConnection,
  type InsertIdeaConnection,
  type IdeaNetwork,
  type InsertIdeaNetwork,
  type IdeaNetworkPrimary,
  type InsertIdeaNetworkPrimary,
} from "../drizzle/schema";
import { words } from "../shared/schema";
import { extractLocationOrder, generateUniqueColor } from "./utils";
import { TRPCError } from "@trpc/server";

export interface IIdeasStorage {
  // Primary Ideas
  createPrimaryIdea(userId: string, idea: {
    term: string;
    description?: string;
    originLanguage?: string;
    primarySource?: string;
  }): Promise<IdeaPrimary>;

  getPrimaryIdea(id: number, userId: string): Promise<IdeaPrimary | undefined>;
  getAllPrimaryIdeas(userId: string): Promise<IdeaPrimary[]>;

  updatePrimaryIdea(id: number, userId: string, updates: Partial<{
    term: string;
    description: string;
    primarySource: string;
    posX: number;
    posY: number;
  }>): Promise<IdeaPrimary>;

  deletePrimaryIdea(id: number, userId: string): Promise<void>;

  // Instances
  createInstance(userId: string, instance: {
    ideaPrimaryId: number;
    wordId?: number;
    context: string;
    source?: string;
    location?: string;
    meaning?: string;
    interpretation?: string;
    dateEncountered?: string;
  }): Promise<IdeaInstance>;

  getInstancesByPrimaryIdea(ideaPrimaryId: number, userId: string): Promise<IdeaInstance[]>;

  updateInstance(id: number, userId: string, updates: Partial<{
    context: string;
    source: string;
    location: string;
    meaning: string;
    interpretation: string;
    dateEncountered: string;
  }>): Promise<IdeaInstance>;

  deleteInstance(id: number, userId: string): Promise<void>;

  // Connections
  createConnection(userId: string, connection: {
    ideaPrimaryIdA: number;
    ideaPrimaryIdB: number;
    connectionType?: string;
    description?: string;
    strength?: number;
  }): Promise<IdeaConnection>;

  getConnectionsForIdea(ideaPrimaryId: number, userId: string): Promise<IdeaConnection[]>;

  updateConnection(id: number, userId: string, updates: Partial<{
    connectionType: string;
    description: string;
    strength: number;
  }>): Promise<IdeaConnection>;

  deleteConnection(id: number, userId: string): Promise<void>;

  // Networks
  createNetwork(userId: string, network: {
    title: string;
    description?: string;
    primarySource?: string;
    ideaPrimaryIds: number[];
    centralIdeaIds?: number[];
  }): Promise<IdeaNetwork>;

  getNetwork(id: number, userId: string): Promise<IdeaNetwork | undefined>;
  getAllNetworks(userId: string): Promise<IdeaNetwork[]>;

  updateNetwork(id: number, userId: string, updates: Partial<{
    title: string;
    description: string;
    primarySource: string;
    ideaPrimaryIds: number[];
  }>): Promise<IdeaNetwork>;

  deleteNetwork(id: number, userId: string): Promise<void>;

  // Central Thesis
  setCentralIdea(networkId: number, ideaPrimaryId: number, userId: string, isCentral: boolean): Promise<void>;

  // Aggregations
  getNetworkWithDetails(networkId: number, userId: string): Promise<{
    network: IdeaNetwork;
    ideas: (IdeaPrimary & { isCentral: boolean })[]
    instances: Record<number, IdeaInstance[]>;
    connections: IdeaConnection[];
  }>;

  getLinkedIdeasForWord(wordId: number, userId: string): Promise<{
    ideas: IdeaPrimary[];
    instances: IdeaInstance[];
    networks: IdeaNetwork[];
  }>;
}

export class IdeasStorage implements IIdeasStorage {
  // ========== PRIMARY IDEAS ==========

  async createPrimaryIdea(userId: string, idea: {
    term: string;
    description?: string;
    originLanguage?: string;
    primarySource?: string;
  }): Promise<IdeaPrimary> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date().toISOString();
    const color = generateUniqueColor();

    const result = await db.insert(ideaPrimaries).values({
      userId,
      term: idea.term,
      description: idea.description,
      originLanguage: idea.originLanguage ?? "english",
      createdAt: now,
      updatedAt: now,
      color,
      primarySource: idea.primarySource,
    });

    const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const created = await db.select().from(ideaPrimaries)
      .where(eq(ideaPrimaries.id, insertId))
      .limit(1);

    return created[0];
  }

  async getPrimaryIdea(id: number, userId: string): Promise<IdeaPrimary | undefined> {
    const db = await getDb();
    if (!db) return undefined;

    const result = await db.select().from(ideaPrimaries)
      .where(and(eq(ideaPrimaries.id, id), eq(ideaPrimaries.userId, userId)))
      .limit(1);

    return result[0];
  }

  async getAllPrimaryIdeas(userId: string): Promise<IdeaPrimary[]> {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(ideaPrimaries)
      .where(eq(ideaPrimaries.userId, userId))
      .orderBy(desc(ideaPrimaries.createdAt));
  }

  async updatePrimaryIdea(id: number, userId: string, updates: Partial<{
    term: string;
    description: string;
    primarySource: string;
    posX: number;
    posY: number;
  }>): Promise<IdeaPrimary> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaPrimaries)
      .where(and(eq(ideaPrimaries.id, id), eq(ideaPrimaries.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Primary idea not found" });
    }

    await db.update(ideaPrimaries)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ideaPrimaries.id, id));

    const updated = await db.select().from(ideaPrimaries)
      .where(eq(ideaPrimaries.id, id))
      .limit(1);

    return updated[0];
  }

  async deletePrimaryIdea(id: number, userId: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaPrimaries)
      .where(and(eq(ideaPrimaries.id, id), eq(ideaPrimaries.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Primary idea not found" });
    }

    // Delete cascades via foreign keys
    await db.delete(ideaPrimaries).where(eq(ideaPrimaries.id, id));
  }

  // ========== INSTANCES ==========

  async createInstance(userId: string, instance: {
    ideaPrimaryId: number;
    wordId?: number;
    context: string;
    source?: string;
    location?: string;
    meaning?: string;
    interpretation?: string;
    dateEncountered?: string;
  }): Promise<IdeaInstance> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Guard: verify wordId belongs to current user (Issue 4)
    if (instance.wordId !== undefined) {
      const word = await db.select().from(words)
        .where(and(
          eq(words.id, instance.wordId),
          eq(words.userId, userId)
        ))
        .limit(1);

      if (!word[0]) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Word not found or does not belong to the current user",
        });
      }
    }

    const locationOrder = extractLocationOrder(instance.location);
    const now = new Date().toISOString();

    const result = await db.insert(ideaInstances).values({
      ideaPrimaryId: instance.ideaPrimaryId,
      userId,
      wordId: instance.wordId,
      context: instance.context,
      source: instance.source,
      location: instance.location,
      locationOrder,
      meaning: instance.meaning,
      interpretation: instance.interpretation,
      dateEncountered: instance.dateEncountered,
      createdAt: now,
      updatedAt: now,
    });

    const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const created = await db.select().from(ideaInstances)
      .where(eq(ideaInstances.id, insertId))
      .limit(1);

    return created[0];
  }

  async getInstancesByPrimaryIdea(ideaPrimaryId: number, userId: string): Promise<IdeaInstance[]> {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(ideaInstances)
      .where(and(
        eq(ideaInstances.ideaPrimaryId, ideaPrimaryId),
        eq(ideaInstances.userId, userId)
      ))
      .orderBy(desc(ideaInstances.locationOrder), desc(ideaInstances.createdAt));
  }

  async updateInstance(id: number, userId: string, updates: Partial<{
    context: string;
    source: string;
    location: string;
    meaning: string;
    interpretation: string;
    dateEncountered: string;
  }>): Promise<IdeaInstance> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaInstances)
      .where(and(eq(ideaInstances.id, id), eq(ideaInstances.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
    }

    // Auto-extract locationOrder if location is being updated (Issue 5)
    let locationOrder = existing[0].locationOrder;
    if (updates.location !== undefined) {
      locationOrder = extractLocationOrder(updates.location);
    }

    await db.update(ideaInstances)
      .set({
        ...updates,
        locationOrder,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ideaInstances.id, id));

    const updated = await db.select().from(ideaInstances)
      .where(eq(ideaInstances.id, id))
      .limit(1);

    return updated[0];
  }

  async deleteInstance(id: number, userId: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaInstances)
      .where(and(eq(ideaInstances.id, id), eq(ideaInstances.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
    }

    await db.delete(ideaInstances).where(eq(ideaInstances.id, id));
  }

  // ========== CONNECTIONS ==========

  async createConnection(userId: string, connection: {
    ideaPrimaryIdA: number;
    ideaPrimaryIdB: number;
    connectionType?: string;
    description?: string;
    strength?: number;
  }): Promise<IdeaConnection> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Normalize direction: always store smaller ID in column A (Issue 1)
    const [idA, idB] = [connection.ideaPrimaryIdA, connection.ideaPrimaryIdB]
      .sort((x, y) => x - y);

    if (idA === idB) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot create connection from an idea to itself",
      });
    }

    const now = new Date().toISOString();

    const result = await db.insert(ideaConnections).values({
      userId,
      ideaPrimaryIdA: idA,
      ideaPrimaryIdB: idB,
      connectionType: connection.connectionType,
      description: connection.description,
      strength: connection.strength ?? 5,
      createdAt: now,
      updatedAt: now,
    });

    const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const created = await db.select().from(ideaConnections)
      .where(eq(ideaConnections.id, insertId))
      .limit(1);

    return created[0];
  }

  async getConnectionsForIdea(ideaPrimaryId: number, userId: string): Promise<IdeaConnection[]> {
    const db = await getDb();
    if (!db) return [];

    // Query both directions (Issue 7)
    return db.select().from(ideaConnections)
      .where(
        and(
          eq(ideaConnections.userId, userId),
          or(
            eq(ideaConnections.ideaPrimaryIdA, ideaPrimaryId),
            eq(ideaConnections.ideaPrimaryIdB, ideaPrimaryId),
          )
        )
      );
  }

  async updateConnection(id: number, userId: string, updates: Partial<{
    connectionType: string;
    description: string;
    strength: number;
  }>): Promise<IdeaConnection> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaConnections)
      .where(and(eq(ideaConnections.id, id), eq(ideaConnections.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
    }

    await db.update(ideaConnections)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ideaConnections.id, id));

    const updated = await db.select().from(ideaConnections)
      .where(eq(ideaConnections.id, id))
      .limit(1);

    return updated[0];
  }

  async deleteConnection(id: number, userId: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaConnections)
      .where(and(eq(ideaConnections.id, id), eq(ideaConnections.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
    }

    await db.delete(ideaConnections).where(eq(ideaConnections.id, id));
  }

  // ========== NETWORKS ==========

  async createNetwork(userId: string, network: {
    title: string;
    description?: string;
    primarySource?: string;
    ideaPrimaryIds: number[];
    centralIdeaIds?: number[];
  }): Promise<IdeaNetwork> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date().toISOString();

    const result = await db.insert(ideaNetworks).values({
      userId,
      title: network.title,
      description: network.description,
      primarySource: network.primarySource,
      createdAt: now,
      updatedAt: now,
    });

    const networkId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
    const centralSet = new Set(network.centralIdeaIds ?? []);

    // Insert junction records (Issue 2)
    for (const ideaPrimaryId of network.ideaPrimaryIds) {
      await db.insert(ideaNetworkPrimaries).values({
        networkId,
        ideaPrimaryId,
        isCentral: centralSet.has(ideaPrimaryId) ? 1 : 0,
      });
    }

    const created = await db.select().from(ideaNetworks)
      .where(eq(ideaNetworks.id, networkId))
      .limit(1);

    return created[0];
  }

  async getNetwork(id: number, userId: string): Promise<IdeaNetwork | undefined> {
    const db = await getDb();
    if (!db) return undefined;

    const result = await db.select().from(ideaNetworks)
      .where(and(eq(ideaNetworks.id, id), eq(ideaNetworks.userId, userId)))
      .limit(1);

    return result[0];
  }

  async getAllNetworks(userId: string): Promise<IdeaNetwork[]> {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(ideaNetworks)
      .where(eq(ideaNetworks.userId, userId))
      .orderBy(desc(ideaNetworks.createdAt));
  }

  async updateNetwork(id: number, userId: string, updates: Partial<{
    title: string;
    description: string;
    primarySource: string;
    ideaPrimaryIds: number[];
  }>): Promise<IdeaNetwork> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaNetworks)
      .where(and(eq(ideaNetworks.id, id), eq(ideaNetworks.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Network not found" });
    }

    // If ideaPrimaryIds is being updated, rebuild junction table
    if (updates.ideaPrimaryIds !== undefined) {
      // Delete existing junctions
      await db.delete(ideaNetworkPrimaries)
        .where(eq(ideaNetworkPrimaries.networkId, id));

      // Insert new junctions
      for (const ideaPrimaryId of updates.ideaPrimaryIds) {
        await db.insert(ideaNetworkPrimaries).values({
          networkId: id,
          ideaPrimaryId,
          isCentral: 0,
        });
      }

      // Remove ideaPrimaryIds from updates object
      const { ideaPrimaryIds, ...rest } = updates;
      updates = rest;
    }

    await db.update(ideaNetworks)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ideaNetworks.id, id));

    const updated = await db.select().from(ideaNetworks)
      .where(eq(ideaNetworks.id, id))
      .limit(1);

    return updated[0];
  }

  async deleteNetwork(id: number, userId: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify ownership
    const existing = await db.select().from(ideaNetworks)
      .where(and(eq(ideaNetworks.id, id), eq(ideaNetworks.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Network not found" });
    }

    // Delete cascades via foreign keys (Issue 2)
    await db.delete(ideaNetworks).where(eq(ideaNetworks.id, id));
  }

  // ========== CENTRAL THESIS ==========

  async setCentralIdea(networkId: number, ideaPrimaryId: number, userId: string, isCentral: boolean): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify the network belongs to this user
    const network = await db.select().from(ideaNetworks)
      .where(and(eq(ideaNetworks.id, networkId), eq(ideaNetworks.userId, userId)))
      .limit(1);

    if (!network[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Network not found or unauthorized" });
    }

    // Verify the junction row exists (idea is in this network)
    const junction = await db.select().from(ideaNetworkPrimaries)
      .where(and(
        eq(ideaNetworkPrimaries.networkId, networkId),
        eq(ideaNetworkPrimaries.ideaPrimaryId, ideaPrimaryId),
      ))
      .limit(1);

    if (!junction[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Idea is not part of this network" });
    }

    await db.update(ideaNetworkPrimaries)
      .set({ isCentral: isCentral ? 1 : 0 })
      .where(and(
        eq(ideaNetworkPrimaries.networkId, networkId),
        eq(ideaNetworkPrimaries.ideaPrimaryId, ideaPrimaryId),
      ));
  }

  // ========== AGGREGATIONS ==========

  async getNetworkWithDetails(networkId: number, userId: string): Promise<{
    network: IdeaNetwork;
    ideas: (IdeaPrimary & { isCentral: boolean })[];
    instances: Record<number, IdeaInstance[]>;
    connections: IdeaConnection[];
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Fetch network
    const network = await db.select().from(ideaNetworks)
      .where(and(eq(ideaNetworks.id, networkId), eq(ideaNetworks.userId, userId)))
      .limit(1);

    if (!network[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Network not found" });
    }

    // Fetch idea IDs from junction table (Issue 2)
    const junctions = await db.select().from(ideaNetworkPrimaries)
      .where(eq(ideaNetworkPrimaries.networkId, networkId));

    const ideaPrimaryIds = junctions.map(j => j.ideaPrimaryId);

    // Build a lookup: ideaPrimaryId → isCentral
    const centralMap = new Map<number, boolean>(
      junctions.map(j => [j.ideaPrimaryId, j.isCentral === 1])
    );

    // Fetch all ideas
    const rawIdeas = ideaPrimaryIds.length > 0
      ? await db.select().from(ideaPrimaries)
          .where(inArray(ideaPrimaries.id, ideaPrimaryIds))
      : [];

    // Attach isCentral to each idea
    const ideas = rawIdeas.map(idea => ({
      ...idea,
      isCentral: centralMap.get(idea.id) ?? false,
    }));

    // Fetch instances for each idea
    const instances: Record<number, IdeaInstance[]> = {};
    for (const ideaId of ideaPrimaryIds) {
      instances[ideaId] = await this.getInstancesByPrimaryIdea(ideaId, userId);
    }

    // Fetch connections between ideas in this network
    const connections = ideaPrimaryIds.length > 0
      ? await db.select().from(ideaConnections)
          .where(and(
            eq(ideaConnections.userId, userId),
            or(
              inArray(ideaConnections.ideaPrimaryIdA, ideaPrimaryIds),
              inArray(ideaConnections.ideaPrimaryIdB, ideaPrimaryIds),
            )
          ))
      : [];

    return { network: network[0], ideas, instances, connections };
  }

  async getLinkedIdeasForWord(wordId: number, userId: string): Promise<{
    ideas: IdeaPrimary[];
    instances: IdeaInstance[];
    networks: IdeaNetwork[];
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Fetch all instances for this word
    const instances = await db.select().from(ideaInstances)
      .where(and(
        eq(ideaInstances.wordId, wordId),
        eq(ideaInstances.userId, userId)
      ));

    // Get unique idea IDs from instances
    const ideaPrimaryIds = Array.from(new Set(instances.map(i => i.ideaPrimaryId)));

    // Fetch all ideas
    const ideas = ideaPrimaryIds.length > 0
      ? await db.select().from(ideaPrimaries)
          .where(inArray(ideaPrimaries.id, ideaPrimaryIds))
      : [];

    // Fetch networks that contain these ideas
    const networkJunctions = ideaPrimaryIds.length > 0
      ? await db.select().from(ideaNetworkPrimaries)
          .where(inArray(ideaNetworkPrimaries.ideaPrimaryId, ideaPrimaryIds))
      : [];

    const networkIds = Array.from(new Set(networkJunctions.map(j => j.networkId)));

    const networks = networkIds.length > 0
      ? await db.select().from(ideaNetworks)
          .where(inArray(ideaNetworks.id, networkIds))
      : [];

    return { ideas, instances, networks };
  }
}

export const ideasStorage = new IdeasStorage();
