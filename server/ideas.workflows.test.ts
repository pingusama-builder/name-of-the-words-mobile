/**
 * Ideas Mode Workflow Tests
 * Tests for the complete Ideas Mode workflows including:
 * - Creating and editing idea networks
 * - Creating and editing primary ideas
 * - Creating instances with full fields
 * - Linking words to ideas
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ideasStorage } from "./storage.ideas";
import { getDb } from "./db";
import { ideaNetworks, ideaPrimaries, ideaInstances } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "test-user-workflow-" + Date.now();

describe("Ideas Mode Workflows", () => {
  let testNetworkId: number;
  let testIdeaId: number;
  let testInstanceId: number;

  describe("Network Creation and Editing", () => {
    it("should create a new idea network", async () => {
      const network = await ideasStorage.createNetwork(TEST_USER_ID, {
        title: "Test Network",
        description: "A test network for workflows",
        ideaPrimaryIds: [],
      });

      expect(network).toBeDefined();
      expect(network.title).toBe("Test Network");
      expect(network.description).toBe("A test network for workflows");
      expect(network.userId).toBe(TEST_USER_ID);

      testNetworkId = network.id;
    });

    it("should update network title and description", async () => {
      const updated = await ideasStorage.updateNetwork(testNetworkId, TEST_USER_ID, {
        title: "Updated Network Title",
        description: "Updated description",
      });

      expect(updated.title).toBe("Updated Network Title");
      expect(updated.description).toBe("Updated description");
    });
  });

  describe("Primary Idea Creation and Editing", () => {
    it("should create a primary idea", async () => {
      const idea = await ideasStorage.createPrimaryIdea(TEST_USER_ID, {
        term: "Test Idea",
        description: "A test idea",
        originLanguage: "english",
        primarySource: "Test Source",
      });

      expect(idea).toBeDefined();
      expect(idea.term).toBe("Test Idea");
      expect(idea.description).toBe("A test idea");
      expect(idea.userId).toBe(TEST_USER_ID);

      testIdeaId = idea.id;
    });

    it("should update primary idea term and description", async () => {
      const updated = await ideasStorage.updatePrimaryIdea(testIdeaId, TEST_USER_ID, {
        term: "Updated Idea Term",
        description: "Updated idea description",
      });

      expect(updated.term).toBe("Updated Idea Term");
      expect(updated.description).toBe("Updated idea description");
    });

    it("should add idea to network", async () => {
      const updated = await ideasStorage.updateNetwork(testNetworkId, TEST_USER_ID, {
        ideaPrimaryIds: [testIdeaId],
      });

      expect(updated).toBeDefined();
    });

    it("should retrieve network with details including the idea", async () => {
      const details = await ideasStorage.getNetworkWithDetails(testNetworkId, TEST_USER_ID);

      expect(details.network).toBeDefined();
      expect(details.ideas.length).toBeGreaterThan(0);
      expect(details.ideas.some(i => i.id === testIdeaId)).toBe(true);
    });
  });

  describe("Instance Creation with Full Fields", () => {
    it("should create instance with all fields", async () => {
      const instance = await ideasStorage.createInstance(TEST_USER_ID, {
        ideaPrimaryId: testIdeaId,
        context: "This is the context where the idea appears",
        location: "p. 42, Chapter 3",
        meaning: "The specific meaning in this context",
        interpretation: "My interpretation of this idea",
        dateEncountered: "2026-05-05",
      });

      expect(instance).toBeDefined();
      expect(instance.context).toBe("This is the context where the idea appears");
      expect(instance.location).toBe("p. 42, Chapter 3");
      expect(instance.meaning).toBe("The specific meaning in this context");
      expect(instance.interpretation).toBe("My interpretation of this idea");
      expect(instance.dateEncountered).toBe("2026-05-05");

      testInstanceId = instance.id;
    });

    it("should update instance fields", async () => {
      const updated = await ideasStorage.updateInstance(testInstanceId, TEST_USER_ID, {
        meaning: "Updated meaning",
        interpretation: "Updated interpretation",
      });

      expect(updated.meaning).toBe("Updated meaning");
      expect(updated.interpretation).toBe("Updated interpretation");
    });

    it("should retrieve instances by idea", async () => {
      const instances = await ideasStorage.getInstancesByPrimaryIdea(testIdeaId, TEST_USER_ID);

      expect(instances.length).toBeGreaterThan(0);
      expect(instances.some(i => i.id === testInstanceId)).toBe(true);
    });
  });

  describe("Linked Ideas for Words", () => {
    it("should retrieve linked ideas for a word (empty when no instances)", async () => {
      // Test with a non-existent word ID to verify the method handles it gracefully
      const linked = await ideasStorage.getLinkedIdeasForWord(99999, TEST_USER_ID);

      expect(linked).toBeDefined();
      expect(linked.ideas).toBeDefined();
      expect(linked.instances).toBeDefined();
      expect(linked.networks).toBeDefined();
      expect(Array.isArray(linked.ideas)).toBe(true);
      expect(Array.isArray(linked.instances)).toBe(true);
      expect(Array.isArray(linked.networks)).toBe(true);
      // Should be empty for non-existent word
      expect(linked.ideas.length).toBe(0);
      expect(linked.instances.length).toBe(0);
    });
  });

  describe("Cleanup", () => {
    it("should delete instance", async () => {
      await ideasStorage.deleteInstance(testInstanceId, TEST_USER_ID);

      const instances = await ideasStorage.getInstancesByPrimaryIdea(testIdeaId, TEST_USER_ID);
      expect(instances.some(i => i.id === testInstanceId)).toBe(false);
    });

    it("should delete primary idea", async () => {
      await ideasStorage.deletePrimaryIdea(testIdeaId, TEST_USER_ID);

      const idea = await ideasStorage.getPrimaryIdea(testIdeaId, TEST_USER_ID);
      expect(idea).toBeUndefined();
    });

    it("should delete network", async () => {
      await ideasStorage.deleteNetwork(testNetworkId, TEST_USER_ID);

      const network = await ideasStorage.getNetwork(testNetworkId, TEST_USER_ID);
      expect(network).toBeUndefined();
    });
  });
});
