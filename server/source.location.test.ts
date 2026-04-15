/**
 * Tests for source / location / locationOrder field persistence
 */
import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "./storage";

const testWord = {
  word: "Sonder",
  originLanguage: "english",
  meaning: "The realization that each passerby has a vivid life",
  context: "Walking through a crowd",
  ratingEssence: 9,
  ratingBeauty: 8,
  ratingSubtlety: 7,
  tags: '["emotion","philosophy"]',
  dateAdded: "2026-04-16",
  createdAt: new Date().toISOString(),
};

describe("source / location field persistence", () => {
  it("createWord stores source and location", async () => {
    const created = await storage.createWord({
      ...testWord,
      source: "Dictionary of Obscure Sorrows",
      location: "p. 42",
      locationOrder: 42,
    });
    expect(created.source).toBe("Dictionary of Obscure Sorrows");
    expect(created.location).toBe("p. 42");
    expect(created.locationOrder).toBe(42);
  });

  it("createWord stores null source/location when omitted", async () => {
    const created = await storage.createWord({ ...testWord });
    expect(created.source).toBeNull();
    expect(created.location).toBeNull();
    expect(created.locationOrder).toBeNull();
  });

  it("updateWord persists a changed source", async () => {
    const created = await storage.createWord({
      ...testWord,
      source: "Original Source",
      location: "p. 1",
      locationOrder: 1,
    });
    const updated = await storage.updateWord(created.id, {
      source: "Updated Source",
      location: "p. 99",
      locationOrder: 99,
    });
    expect(updated?.source).toBe("Updated Source");
    expect(updated?.location).toBe("p. 99");
    expect(updated?.locationOrder).toBe(99);
  });

  it("updateWord can clear source by setting null", async () => {
    const created = await storage.createWord({
      ...testWord,
      source: "Some Book",
      location: "ch. 5",
      locationOrder: 5,
    });
    const updated = await storage.updateWord(created.id, {
      source: null,
      location: null,
      locationOrder: null,
    });
    expect(updated?.source).toBeNull();
    expect(updated?.location).toBeNull();
    expect(updated?.locationOrder).toBeNull();
  });

  it("getAllWords returns source/location fields", async () => {
    await storage.createWord({
      ...testWord,
      word: "TestSourceWord",
      source: "Test Book",
      location: "p. 7",
      locationOrder: 7,
    });
    const all = await storage.getAllWords();
    const found = all.find(w => w.word === "TestSourceWord");
    expect(found).toBeDefined();
    expect(found?.source).toBe("Test Book");
    expect(found?.location).toBe("p. 7");
    expect(found?.locationOrder).toBe(7);
  });
});
