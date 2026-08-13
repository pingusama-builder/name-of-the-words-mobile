/**
 * Network Connections Tests
 * Tests for network-to-network connection functionality
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  ideaConnections,
  ideaInstances,
  ideaNetworkConnections,
  ideaNetworkPrimaries,
  ideaNetworks,
  ideaPrimaries,
} from "../drizzle/schema";
import { getDb } from "./db";
import { ideasStorage } from "./storage.ideas";

const TEST_USER_ID = "test-user-network-connections";

async function cleanupPersistentNetworkTestData() {
  const db = await getDb();
  if (!db) return;

  const networks = await db
    .select({ id: ideaNetworks.id })
    .from(ideaNetworks)
    .where(eq(ideaNetworks.userId, TEST_USER_ID));
  const networkIds = networks.map((network) => network.id);

  await db.delete(ideaNetworkConnections).where(eq(ideaNetworkConnections.userId, TEST_USER_ID));
  if (networkIds.length > 0) {
    await db.delete(ideaNetworkPrimaries).where(inArray(ideaNetworkPrimaries.networkId, networkIds));
  }
  await db.delete(ideaConnections).where(eq(ideaConnections.userId, TEST_USER_ID));
  await db.delete(ideaInstances).where(eq(ideaInstances.userId, TEST_USER_ID));
  await db.delete(ideaNetworks).where(eq(ideaNetworks.userId, TEST_USER_ID));
  await db.delete(ideaPrimaries).where(eq(ideaPrimaries.userId, TEST_USER_ID));
}

async function cleanupNetworkConnectionsBetweenTests() {
  const db = await getDb();
  if (!db) return;
  await db.delete(ideaNetworkConnections).where(eq(ideaNetworkConnections.userId, TEST_USER_ID));
}

describe("Network Connections", () => {
  let networkA: any;
  let networkB: any;
  let networkC: any;
  let networkD: any;
  let primaryIdea1: any;
  let primaryIdea2: any;
  let primaryIdea3: any;
  let primaryIdea4: any;

  beforeAll(async () => {
    await cleanupPersistentNetworkTestData();

    // Create test networks
    primaryIdea1 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
      term: "Test Idea 1",
      description: "First test idea",
    });

    primaryIdea2 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
      term: "Test Idea 2",
      description: "Second test idea",
    });
    primaryIdea3 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
      term: "Test Idea 3",
    });
    primaryIdea4 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
      term: "Test Idea 4",
    });

    networkA = await ideasStorage.createNetwork(TEST_USER_ID, {
      title: "Network A",
      description: "First test network",
      ideaPrimaryIds: [primaryIdea1.id],
    });

    networkB = await ideasStorage.createNetwork(TEST_USER_ID, {
      title: "Network B",
      description: "Second test network",
      ideaPrimaryIds: [primaryIdea2.id],
    });
    networkC = await ideasStorage.createNetwork(TEST_USER_ID, {
      title: "Network C",
      ideaPrimaryIds: [primaryIdea3.id],
    });
    networkD = await ideasStorage.createNetwork(TEST_USER_ID, {
      title: "Network D",
      ideaPrimaryIds: [primaryIdea4.id],
    });
  });

  afterEach(async () => {
    await cleanupNetworkConnectionsBetweenTests();
  });

  afterAll(async () => {
    await cleanupPersistentNetworkTestData();
  });

  it("should create a network connection", async () => {
    const connection = await ideasStorage.createNetworkConnection(
      TEST_USER_ID,
      {
        networkIdA: networkA.id,
        networkIdB: networkB.id,
        connectionType: "related",
        description: "These networks are related",
        strength: 7,
      }
    );

    expect(connection).toBeDefined();
    expect(connection.networkIdA).toBe(networkA.id);
    expect(connection.networkIdB).toBe(networkB.id);
    expect(connection.connectionType).toBe("related");
    expect(connection.description).toBe("These networks are related");
    expect(connection.strength).toBe(7);
  });

  it("should get network connections", async () => {
    // Create a connection
    await ideasStorage.createNetworkConnection(TEST_USER_ID, {
      networkIdA: networkA.id,
      networkIdB: networkB.id,
      connectionType: "supports",
      strength: 8,
    });

    // Get connections for network A
    const connections = await ideasStorage.getNetworkConnections(
      networkA.id,
      TEST_USER_ID
    );

    expect(connections.length).toBeGreaterThan(0);
    const connection = connections.find(
      (c: any) =>
        (c.networkIdA === networkA.id && c.networkIdB === networkB.id) ||
        (c.networkIdA === networkB.id && c.networkIdB === networkA.id)
    );
    expect(connection).toBeDefined();
  });

  it("should update a network connection", async () => {
    // Create a connection
    const connection = await ideasStorage.createNetworkConnection(
      TEST_USER_ID,
      {
        networkIdA: networkA.id,
        networkIdB: networkB.id,
        connectionType: "contrast",
        strength: 5,
      }
    );

    // Update it
    const updated = await ideasStorage.updateNetworkConnection(
      connection.id,
      TEST_USER_ID,
      {
        connectionType: "contradicts",
        strength: 9,
        description: "Updated description",
      }
    );

    expect(updated.connectionType).toBe("contradicts");
    expect(updated.strength).toBe(9);
    expect(updated.description).toBe("Updated description");
  });

  it("should delete a network connection", async () => {
    // Create a connection
    const connection = await ideasStorage.createNetworkConnection(
      TEST_USER_ID,
      {
        networkIdA: networkA.id,
        networkIdB: networkB.id,
        connectionType: "enables",
      }
    );

    // Delete it
    await ideasStorage.deleteNetworkConnection(connection.id, TEST_USER_ID);

    // Verify it's deleted by checking connections
    const connections = await ideasStorage.getNetworkConnections(
      networkA.id,
      TEST_USER_ID
    );

    const deleted = connections.find((c: any) => c.id === connection.id);
    expect(deleted).toBeUndefined();
  });

  it("should enforce user isolation for network connections", async () => {
    const otherUserId = "other-user-network-connections";

    // Create a connection as first user
    const connection = await ideasStorage.createNetworkConnection(
      TEST_USER_ID,
      {
        networkIdA: networkA.id,
        networkIdB: networkB.id,
        connectionType: "related",
      }
    );

    // Try to get connections as different user
    const connections = await ideasStorage.getNetworkConnections(
      networkA.id,
      otherUserId
    );

    // Should not see the connection
    const found = connections.find((c: any) => c.id === connection.id);
    expect(found).toBeUndefined();
  });

  it("should support different connection types", async () => {
    const types = ["related", "contrast", "supports", "contradicts", "precedes", "enables"] as const;
    const pairs = [
      [networkA, networkB],
      [networkA, networkC],
      [networkA, networkD],
      [networkB, networkC],
      [networkB, networkD],
      [networkC, networkD],
    ];

    for (const [index, type] of types.entries()) {
      const [networkOne, networkTwo] = pairs[index];
      const connection = await ideasStorage.createNetworkConnection(
        TEST_USER_ID,
        {
          networkIdA: networkOne.id,
          networkIdB: networkTwo.id,
          connectionType: type,
        }
      );

      expect(connection.connectionType).toBe(type);
    }
  });
});
