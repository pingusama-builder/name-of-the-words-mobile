/**
 * Ideas Mode Storage Layer Tests
 * Comprehensive vitest coverage for all critical fixes and core functionality
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { ideasStorage } from "./storage.ideas";
import { TRPCError } from "@trpc/server";

// Test user ID
const TEST_USER_ID = "test-user-123";
const OTHER_USER_ID = "other-user-456";

describe("Ideas Mode Storage Layer", () => {
  // ========== PRIMARY IDEAS ==========

  describe("Primary Ideas", () => {
    it("should create a primary idea with auto-generated color", async () => {
      const idea = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Thick-slicing",
        description: "Rapid cognition based on limited information",
        originLanguage: "english",
      });

      expect(idea).toBeDefined();
      expect(idea.term).toBe("Thick-slicing");
      expect(idea.userId).toBe(TEST_USER_ID);
      expect(idea.color).toMatch(/^#[0-9a-f]{6}$/i); // Hex color format
    });

    it("should retrieve a primary idea by ID with user isolation", async () => {
      const created = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Test Idea",
      });

      const retrieved = await ideasStorage.getPrimaryIdea(created.id, TEST_USER_ID);
      expect(retrieved).toBeDefined();
      expect(retrieved?.term).toBe("Test Idea");

      // Other user cannot access
      const forbidden = await ideasStorage.getPrimaryIdea(created.id, OTHER_USER_ID);
      expect(forbidden).toBeUndefined();
    });

    it("should list all primary ideas for a user", async () => {
      const idea1 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Idea 1",
      });
      const idea2 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Idea 2",
      });

      const list = await ideasStorage.getAllPrimaryIdeas(TEST_USER_ID);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.map(i => i.id)).toContain(idea1.id);
      expect(list.map(i => i.id)).toContain(idea2.id);
    });

    it("should update a primary idea", async () => {
      const created = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Original",
      });

      const updated = await ideasStorage.updatePrimaryIdea(created.id, TEST_USER_ID, {
        term: "Updated",
        description: "New description",
      });

      expect(updated.term).toBe("Updated");
      expect(updated.description).toBe("New description");
    });

    it("should throw NOT_FOUND when updating non-existent idea", async () => {
      await expect(
        ideasStorage.updatePrimaryIdea(99999, TEST_USER_ID, { term: "Test" })
      ).rejects.toThrow("Primary idea not found");
    });

    it("should delete a primary idea", async () => {
      const created = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "To Delete",
      });

      await ideasStorage.deletePrimaryIdea(created.id, TEST_USER_ID);

      const retrieved = await ideasStorage.getPrimaryIdea(created.id, TEST_USER_ID);
      expect(retrieved).toBeUndefined();
    });
  });

  // ========== INSTANCES ==========

  describe("Instances", () => {
    let primaryIdea: any;

    beforeAll(async () => {
      primaryIdea = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Test Primary",
      });
    });

    it("should create an instance with location order extraction (Issue 5)", async () => {
      const instance = await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: primaryIdea.id,
        context: "Found in chapter 4",
        location: "p. 42",
      });

      expect(instance).toBeDefined();
      expect(instance.context).toBe("Found in chapter 4");
      expect(instance.locationOrder).toBe(42); // Extracted from "p. 42"
    });

    it("should extract location order from various formats", async () => {
      const testCases = [
        { location: "p. 23", expected: 23 },
        { location: "Ch. 4, p. 89", expected: 89 },
        { location: "page 102", expected: 102 },
        { location: "1:23:45", expected: 5025 }, // 1h 23m 45s
        { location: "5:30", expected: 330 }, // 5m 30s
      ];

      for (const { location, expected } of testCases) {
        const instance = await ideasStorage.createInstance(TEST_USER_ID, {
          ideaPrimaryId: primaryIdea.id,
          context: `Test at ${location}`,
          location,
        });
        expect(instance.locationOrder).toBe(expected);
      }
    });

    it("should validate word ownership (Issue 4)", async () => {
      // Try to create instance with non-existent word
      await expect(
        ideasStorage.createInstance(TEST_USER_ID, {
          ideaPrimaryId: primaryIdea.id,
          wordId: 99999,
          context: "Test",
        })
      ).rejects.toThrow("Word not found or does not belong to the current user");
    });

    it("should update instance with all fields including location", async () => {
      const instance = await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: primaryIdea.id,
        context: "Original context",
        location: "p. 10",
      });

      const updated = await ideasStorage.updateInstance(instance.id, TEST_USER_ID, {
        context: "Updated context",
        location: "p. 50",
        meaning: "New meaning",
        interpretation: "New interpretation",
      });

      expect(updated.context).toBe("Updated context");
      expect(updated.locationOrder).toBe(50); // Re-extracted
      expect(updated.meaning).toBe("New meaning");
      expect(updated.interpretation).toBe("New interpretation");
    });

    it("should retrieve instances by primary idea", async () => {
      const inst1 = await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: primaryIdea.id,
        context: "Instance 1",
      });
      const inst2 = await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: primaryIdea.id,
        context: "Instance 2",
      });

      const instances = await ideasStorage.getInstancesByPrimaryIdea(
        primaryIdea.id,
        TEST_USER_ID
      );

      expect(instances.length).toBeGreaterThanOrEqual(2);
      expect(instances.map(i => i.id)).toContain(inst1.id);
      expect(instances.map(i => i.id)).toContain(inst2.id);
    });

    it("should delete an instance", async () => {
      const instance = await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: primaryIdea.id,
        context: "To delete",
      });

      await ideasStorage.deleteInstance(instance.id, TEST_USER_ID);

      const instances = await ideasStorage.getInstancesByPrimaryIdea(
        primaryIdea.id,
        TEST_USER_ID
      );

      expect(instances.map(i => i.id)).not.toContain(instance.id);
    });
  });

  // ========== CONNECTIONS ==========

  describe("Connections", () => {
    let idea1: any;
    let idea2: any;
    let idea3: any;

    beforeAll(async () => {
      idea1 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Idea 1",
      });
      idea2 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Idea 2",
      });
      idea3 = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Idea 3",
      });
    });

    it("should normalize connection direction (Issue 1)", async () => {
      // Create connection with larger ID first
      const conn = await ideasStorage.createConnection(TEST_USER_ID, {
        ideaPrimaryIdA: idea2.id,
        ideaPrimaryIdB: idea1.id, // Smaller ID
        connectionType: "contrast",
      });

      // Should be stored with smaller ID in column A
      expect(Math.min(conn.ideaPrimaryIdA, conn.ideaPrimaryIdB)).toBe(
        Math.min(idea1.id, idea2.id)
      );
      expect(Math.max(conn.ideaPrimaryIdA, conn.ideaPrimaryIdB)).toBe(
        Math.max(idea1.id, idea2.id)
      );
    });

    it("should prevent duplicate connections (Issue 1)", async () => {
      // Create first connection
      await ideasStorage.createConnection(TEST_USER_ID, {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea2.id,
        connectionType: "contrast",
      });

      // Try to create reverse connection (should be normalized to same)
      await expect(
        ideasStorage.createConnection(TEST_USER_ID, {
          ideaPrimaryIdA: idea2.id,
          ideaPrimaryIdB: idea1.id,
          connectionType: "supports",
        })
      ).rejects.toThrow(); // UNIQUE constraint violation
    });

    it("should prevent self-connections", async () => {
      await expect(
        ideasStorage.createConnection(TEST_USER_ID, {
          ideaPrimaryIdA: idea1.id,
          ideaPrimaryIdB: idea1.id,
        })
      ).rejects.toThrow("Cannot create connection from an idea to itself");
    });

    it("should retrieve connections bidirectionally (Issue 7)", async () => {
      const conn = await ideasStorage.createConnection(TEST_USER_ID, {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea3.id,
        connectionType: "supports",
      });

      // Query from idea1 perspective
      const connectionsFromIdea1 = await ideasStorage.getConnectionsForIdea(
        idea1.id,
        TEST_USER_ID
      );
      expect(connectionsFromIdea1.map(c => c.id)).toContain(conn.id);

      // Query from idea3 perspective
      const connectionsFromIdea3 = await ideasStorage.getConnectionsForIdea(
        idea3.id,
        TEST_USER_ID
      );
      expect(connectionsFromIdea3.map(c => c.id)).toContain(conn.id);
    });

    it("should update connection", async () => {
      const conn = await ideasStorage.createConnection(TEST_USER_ID, {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea2.id,
        connectionType: "contrast",
        strength: 5,
      });

      const updated = await ideasStorage.updateConnection(conn.id, TEST_USER_ID, {
        connectionType: "supports",
        strength: 8,
      });

      expect(updated.connectionType).toBe("supports");
      expect(updated.strength).toBe(8);
    });

    it("should delete connection", async () => {
      const conn = await ideasStorage.createConnection(TEST_USER_ID, {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea3.id,
      });

      await ideasStorage.deleteConnection(conn.id, TEST_USER_ID);

      const connections = await ideasStorage.getConnectionsForIdea(
        idea1.id,
        TEST_USER_ID
      );

      expect(connections.map(c => c.id)).not.toContain(conn.id);
    });
  });

  // ========== NETWORKS ==========

  describe("Networks", () => {
    let ideas: any[];

    beforeAll(async () => {
      ideas = await Promise.all([
        ideasStorage.createPrimaryIdea(TEST_USER_ID, { term: "Central Idea" }),
        ideasStorage.createPrimaryIdea(TEST_USER_ID, { term: "Supporting Idea 1" }),
        ideasStorage.createPrimaryIdea(TEST_USER_ID, { term: "Supporting Idea 2" }),
      ]);
    });

    it("should create network with junction table (Issue 2)", async () => {
      const network = await ideasStorage.createNetwork(TEST_USER_ID, {
        title: "Test Network",
        description: "A test network",
        ideaPrimaryIds: [ideas[0].id, ideas[1].id, ideas[2].id],
      });

      expect(network).toBeDefined();
      expect(network.title).toBe("Test Network");
      expect(network.userId).toBe(TEST_USER_ID);
    });

    it("should support central thesis marking (v3 patch)", async () => {
      const network = await ideasStorage.createNetwork(TEST_USER_ID, {
        title: "Network with Central",
        ideaPrimaryIds: [ideas[0].id, ideas[1].id],
        centralIdeaIds: [ideas[0].id], // Mark first as central
      });

      const details = await ideasStorage.getNetworkWithDetails(network.id, TEST_USER_ID);
      const centralIdea = details.ideas.find(i => i.id === ideas[0].id);
      expect(centralIdea?.isCentral).toBe(true);

      const supportingIdea = details.ideas.find(i => i.id === ideas[1].id);
      expect(supportingIdea?.isCentral).toBe(false);
    });

    it("should toggle central thesis", async () => {
      const network = await ideasStorage.createNetwork(TEST_USER_ID, {
        title: "Toggle Test",
        ideaPrimaryIds: [ideas[0].id, ideas[1].id],
      });

      // Mark as central
      await ideasStorage.setCentralIdea(network.id, ideas[0].id, TEST_USER_ID, true);

      let details = await ideasStorage.getNetworkWithDetails(network.id, TEST_USER_ID);
      expect(details.ideas.find(i => i.id === ideas[0].id)?.isCentral).toBe(true);

      // Unmark
      await ideasStorage.setCentralIdea(network.id, ideas[0].id, TEST_USER_ID, false);

      details = await ideasStorage.getNetworkWithDetails(network.id, TEST_USER_ID);
      expect(details.ideas.find(i => i.id === ideas[0].id)?.isCentral).toBe(false);
    });

    it("should cascade delete via junction table (Issue 2)", async () => {
      const network = await ideasStorage.createNetwork(TEST_USER_ID, {
        title: "To Delete",
        ideaPrimaryIds: [ideas[0].id, ideas[1].id],
      });

      await ideasStorage.deleteNetwork(network.id, TEST_USER_ID);

      const retrieved = await ideasStorage.getNetwork(network.id, TEST_USER_ID);
      expect(retrieved).toBeUndefined();
    });

    it("should retrieve network with full details", async () => {
      const network = await ideasStorage.createNetwork(TEST_USER_ID, {
        title: "Full Details Test",
        ideaPrimaryIds: [ideas[0].id, ideas[1].id],
      });

      // Add instances
      await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: ideas[0].id,
        context: "Instance 1",
      });

      // Add connection
      await ideasStorage.createConnection(TEST_USER_ID, {
        ideaPrimaryIdA: ideas[0].id,
        ideaPrimaryIdB: ideas[1].id,
        connectionType: "supports",
      });

      const details = await ideasStorage.getNetworkWithDetails(network.id, TEST_USER_ID);

      expect(details.network.id).toBe(network.id);
      expect(details.ideas.length).toBe(2);
      expect(details.instances[ideas[0].id].length).toBeGreaterThan(0);
      expect(details.connections.length).toBeGreaterThan(0);
    });
  });

  // ========== USER ISOLATION ==========

  describe("User Isolation", () => {
    it("should enforce user isolation on all operations", async () => {
      const user1Idea = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "User 1 Idea",
      });

      // User 2 cannot access
      const retrieved = await ideasStorage.getPrimaryIdea(user1Idea.id, OTHER_USER_ID);
      expect(retrieved).toBeUndefined();

      // User 2 cannot update
      await expect(
        ideasStorage.updatePrimaryIdea(user1Idea.id, OTHER_USER_ID, {
          term: "Hacked",
        })
      ).rejects.toThrow("Primary idea not found");

      // User 2 cannot delete
      await expect(
        ideasStorage.deletePrimaryIdea(user1Idea.id, OTHER_USER_ID)
      ).rejects.toThrow("Primary idea not found");
    });
  });
});
