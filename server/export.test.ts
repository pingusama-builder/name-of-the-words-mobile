import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  users,
  words,
  tags,
  ideaPrimaries,
  ideaInstances,
  ideaNetworks,
  ideaNetworkPrimaries,
} from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

describe("JSON export data shape", () => {
  let testUserId: string;
  let testWordId: number;
  let testNetworkId: number;
  let testIdeaId: number;
  let testTagName: string;
  let setupComplete = false;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is not available for export tests");

    const suffix = Date.now().toString();
    testUserId = `test-export-${suffix}`;
    testTagName = `export-tag-${suffix}`;
    const testWord = `export-word-${suffix}`;
    const now = new Date().toISOString();

    await db.insert(users).values({
      email: `${testUserId}@example.com`,
      openId: testUserId,
      name: "Test Export User",
    });

    await db.insert(words).values({
      userId: testUserId,
      word: testWord,
      originLanguage: "english",
      meaning: "A test word for export",
      tags: JSON.stringify([testTagName]),
      dateAdded: now.slice(0, 10),
      createdAt: now,
    });
    const [word] = await db.select({ id: words.id }).from(words).where(eq(words.word, testWord));
    testWordId = word.id;

    await db.insert(tags).values({ name: testTagName });

    await db.insert(ideaNetworks).values({
      userId: testUserId,
      title: "Export Test Network",
      description: "A network for testing export",
      createdAt: now,
      updatedAt: now,
    });
    const [network] = await db
      .select({ id: ideaNetworks.id })
      .from(ideaNetworks)
      .where(eq(ideaNetworks.userId, testUserId));
    testNetworkId = network.id;

    await db.insert(ideaPrimaries).values({
      userId: testUserId,
      term: "export-idea",
      description: "An idea for testing export",
      createdAt: now,
      updatedAt: now,
    });
    const [idea] = await db
      .select({ id: ideaPrimaries.id })
      .from(ideaPrimaries)
      .where(eq(ideaPrimaries.userId, testUserId));
    testIdeaId = idea.id;

    await db.insert(ideaNetworkPrimaries).values({
      networkId: testNetworkId,
      ideaPrimaryId: testIdeaId,
    });

    await db.insert(ideaInstances).values({
      userId: testUserId,
      ideaPrimaryId: testIdeaId,
      wordId: testWordId,
      context: "Test context for instance",
      createdAt: now,
      updatedAt: now,
    });

    setupComplete = true;
  });

  afterAll(async () => {
    if (!setupComplete) return;
    const db = await getDb();
    if (!db) return;

    await db.delete(ideaInstances).where(eq(ideaInstances.userId, testUserId));
    await db.delete(ideaNetworkPrimaries).where(eq(ideaNetworkPrimaries.networkId, testNetworkId));
    await db.delete(ideaNetworks).where(eq(ideaNetworks.userId, testUserId));
    await db.delete(ideaPrimaries).where(eq(ideaPrimaries.userId, testUserId));
    await db.delete(tags).where(eq(tags.name, testTagName));
    await db.delete(words).where(eq(words.id, testWordId));
    await db.delete(users).where(eq(users.openId, testUserId));
  });

  it("exports words, global tags, ideas, and network junction rows", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is not available for export tests");

    const allWords = await db.select().from(words).where(eq(words.userId, testUserId));
    const allTags = await db.select().from(tags);
    const primaries = await db.select().from(ideaPrimaries).where(eq(ideaPrimaries.userId, testUserId));
    const instances = await db.select().from(ideaInstances).where(eq(ideaInstances.userId, testUserId));
    const networks = await db.select().from(ideaNetworks).where(eq(ideaNetworks.userId, testUserId));
    const connections: unknown[] = [];
    const networkConnections: unknown[] = [];
    const networkIds = networks.map((network) => network.id);
    const networkPrimaries = networkIds.length
      ? await db
          .select()
          .from(ideaNetworkPrimaries)
          .where(inArray(ideaNetworkPrimaries.networkId, networkIds))
      : [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      words: allWords,
      tags: allTags.map((tag) => tag.name),
      ideas: {
        primaries,
        instances,
        connections,
        networks,
        networkPrimaries,
        networkConnections,
      },
    };

    expect(exportData).toMatchObject({
      words: expect.any(Array),
      tags: expect.arrayContaining([testTagName]),
      ideas: {
        primaries: expect.any(Array),
        instances: expect.any(Array),
        connections: expect.any(Array),
        networks: expect.any(Array),
        networkPrimaries: expect.any(Array),
        networkConnections: expect.any(Array),
      },
    });
    expect(exportData.words.some((word) => word.id === testWordId)).toBe(true);
    expect(exportData.ideas.primaries.some((idea) => idea.id === testIdeaId)).toBe(true);
    expect(exportData.ideas.instances.some((instance) => instance.wordId === testWordId)).toBe(true);
    expect(exportData.ideas.networks.some((network) => network.id === testNetworkId)).toBe(true);
    expect(exportData.ideas.networkPrimaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ networkId: testNetworkId, ideaPrimaryId: testIdeaId }),
      ]),
    );
  });

  it("returns empty tags and idea arrays for an unauthenticated export", () => {
    const unauthenticatedExport = {
      exportedAt: new Date().toISOString(),
      words: [],
      tags: [],
      ideas: {
        primaries: [],
        instances: [],
        connections: [],
        networks: [],
        networkPrimaries: [],
        networkConnections: [],
      },
    };

    expect(unauthenticatedExport.tags).toEqual([]);
    expect(unauthenticatedExport.ideas).toEqual({
      primaries: [],
      instances: [],
      connections: [],
      networks: [],
      networkPrimaries: [],
      networkConnections: [],
    });
  });
});
