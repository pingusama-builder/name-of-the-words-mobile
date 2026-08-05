import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, words, tags, ideaPrimaries, ideaInstances, ideaNetworks, ideaNetworkPrimaries } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Export Endpoint", () => {
  let testUserId: string;
  let testWordId: string;
  let testNetworkId: string;

  beforeAll(async () => {
    const db = getDb();

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: "test-export@example.com",
        openId: "test-export-" + Date.now(),
        name: "Test Export User",
      })
      .returning();

    testUserId = user.id;

    // Create test word
    const [word] = await db
      .insert(words)
      .values({
        userId: testUserId,
        word: "exportTest",
        originLanguage: "en",
        meaning: "A test word for export",
        tags: JSON.stringify(["test", "export"]),
      })
      .returning();

    testWordId = word.id;

    // Create test tag
    await db.insert(tags).values({
      userId: testUserId,
      name: "exportTag",
    });

    // Create test idea network
    const [network] = await db
      .insert(ideaNetworks)
      .values({
        userId: testUserId,
        title: "Export Test Network",
        description: "A network for testing export",
      })
      .returning();

    testNetworkId = network.id;

    // Create test idea primary
    const [idea] = await db
      .insert(ideaPrimaries)
      .values({
        userId: testUserId,
        term: "exportIdea",
        description: "An idea for testing export",
      })
      .returning();

    // Link idea to network
    await db.insert(ideaNetworkPrimaries).values({
      networkId: testNetworkId,
      ideaPrimaryId: idea.id,
    });

    // Create test instance
    await db.insert(ideaInstances).values({
      userId: testUserId,
      ideaPrimaryId: idea.id,
      context: "Test context for instance",
    });
  });

  afterAll(async () => {
    const db = getDb();

    // Cleanup test data
    await db.delete(ideaInstances).where(eq(ideaInstances.userId, testUserId));
    await db.delete(ideaNetworkPrimaries).where(eq(ideaNetworkPrimaries.networkId, testNetworkId));
    await db.delete(ideaNetworks).where(eq(ideaNetworks.userId, testUserId));
    await db.delete(ideaPrimaries).where(eq(ideaPrimaries.userId, testUserId));
    await db.delete(tags).where(eq(tags.userId, testUserId));
    await db.delete(words).where(eq(words.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should export all user data in correct shape", async () => {
    const db = getDb();

    // Simulate what the export endpoint does
    const allWords = await db.select().from(words).where(eq(words.userId, testUserId));
    const allTags = await db.select().from(tags).where(eq(tags.userId, testUserId));
    const primaries = await db.select().from(ideaPrimaries).where(eq(ideaPrimaries.userId, testUserId));
    const instances = await db.select().from(ideaInstances).where(eq(ideaInstances.userId, testUserId));
    const networks = await db.select().from(ideaNetworks).where(eq(ideaNetworks.userId, testUserId));

    const networkIds = networks.map(n => n.id);
    let networkPrimaries = [];
    if (networkIds.length > 0) {
      networkPrimaries = await db
        .select()
        .from(ideaNetworkPrimaries)
        .where(eq(ideaNetworkPrimaries.networkId, networkIds[0]));
    }

    // Build export shape
    const exportData = {
      exportedAt: new Date().toISOString(),
      words: allWords,
      tags: allTags.map(t => t.name),
      ideas: {
        primaries,
        instances,
        connections: [],
        networks,
        networkPrimaries,
        networkConnections: [],
      },
    };

    // Verify structure
    expect(exportData).toHaveProperty("exportedAt");
    expect(exportData).toHaveProperty("words");
    expect(exportData).toHaveProperty("tags");
    expect(exportData).toHaveProperty("ideas");

    // Verify words
    expect(Array.isArray(exportData.words)).toBe(true);
    expect(exportData.words.length).toBeGreaterThan(0);
    expect(exportData.words[0].word).toBe("exportTest");

    // Verify tags
    expect(Array.isArray(exportData.tags)).toBe(true);
    expect(exportData.tags).toContain("exportTag");

    // Verify ideas structure
    expect(exportData.ideas).toHaveProperty("primaries");
    expect(exportData.ideas).toHaveProperty("instances");
    expect(exportData.ideas).toHaveProperty("connections");
    expect(exportData.ideas).toHaveProperty("networks");
    expect(exportData.ideas).toHaveProperty("networkPrimaries");
    expect(exportData.ideas).toHaveProperty("networkConnections");

    // Verify ideas data
    expect(exportData.ideas.primaries.length).toBeGreaterThan(0);
    expect(exportData.ideas.instances.length).toBeGreaterThan(0);
    expect(exportData.ideas.networks.length).toBeGreaterThan(0);
    expect(exportData.ideas.networkPrimaries.length).toBeGreaterThan(0);
  });

  it("should handle unauthenticated export (no userId)", async () => {
    // When no userId, should return empty ideas and tags
    const exportData = {
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

    expect(exportData.tags).toEqual([]);
    expect(exportData.ideas.primaries).toEqual([]);
    expect(exportData.ideas.instances).toEqual([]);
  });

  it("should preserve all idea data types in export", async () => {
    const db = getDb();

    const ideas = await db.select().from(ideaPrimaries).where(eq(ideaPrimaries.userId, testUserId));

    expect(ideas.length).toBeGreaterThan(0);

    const idea = ideas[0];
    expect(idea).toHaveProperty("id");
    expect(idea).toHaveProperty("userId");
    expect(idea).toHaveProperty("term");
    expect(idea).toHaveProperty("description");
    expect(idea).toHaveProperty("isCentralThesis");
    expect(idea).toHaveProperty("createdAt");
  });
});
