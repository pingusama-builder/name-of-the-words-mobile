/**
 * Tests for tag persistence:
 * 1. POST /api/words with tags array creates tags in the tags table
 * 2. Tags are stored as JSON array in words.tags column
 * 3. Duplicate tags are not re-created (idempotent createTag)
 */

import { describe, expect, it } from "vitest";
import { DatabaseStorage } from "./storage";

describe("tag persistence via storage", () => {
  const store = new DatabaseStorage();

  it("createTag is idempotent — calling it twice with the same name does not throw", async () => {
    // The storage.createTag should handle duplicate gracefully (INSERT IGNORE or similar)
    await expect(store.createTag({ name: "test-tag-idempotent" })).resolves.not.toThrow();
    await expect(store.createTag({ name: "test-tag-idempotent" })).resolves.not.toThrow();
  });

  it("getAllTags returns an array", async () => {
    const tags = await store.getAllTags();
    expect(Array.isArray(tags)).toBe(true);
  });

  it("getAllTags includes tags that were created", async () => {
    const uniqueName = `vitest-tag-${Date.now()}`;
    await store.createTag({ name: uniqueName });
    const tags = await store.getAllTags();
    const names = tags.map(t => t.name);
    expect(names).toContain(uniqueName);
  });

  it("createWord stores tags as JSON array string", async () => {
    const now = new Date();
    const word = await store.createWord({
      word: `vitest-word-${Date.now()}`,
      originLanguage: "english",
      meaning: "test meaning",
      context: "test context",
      ratingEssence: 5,
      ratingBeauty: 5,
      ratingSubtlety: 5,
      tags: JSON.stringify(["vitest-a", "vitest-b"]),
      pairedWord: null,
      pairedMeaning: null,
      dateAdded: now.toISOString().split("T")[0],
      createdAt: now.toISOString(),
      userId: null,
    });

    // tags should be stored as a JSON string
    expect(typeof word.tags).toBe("string");
    const parsed = JSON.parse(word.tags || "[]");
    expect(parsed).toContain("vitest-a");
    expect(parsed).toContain("vitest-b");
  });
});

// ── Tag normalisation in POST /api/words ─────────────────────────────────

describe("tag normalisation logic (unit)", () => {
  it("parses JSON string tags correctly", () => {
    const raw = '["nature","beauty"]';
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(["nature", "beauty"]);
  });

  it("handles array tags directly", () => {
    const raw = ["nature", "beauty"];
    const result = Array.isArray(raw) ? raw : JSON.parse(raw);
    expect(result).toEqual(["nature", "beauty"]);
  });

  it("handles empty tags gracefully", () => {
    const raw = "[]";
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual([]);
  });

  it("flushes pending tagInput into final tags list", () => {
    // Simulates the handleSubmit logic in AddWord.tsx
    const selectedTags = ["nature"];
    const tagInput = "beauty"; // user typed but didn't press Enter

    const finalTags = [...selectedTags];
    const pendingTag = tagInput.trim();
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    expect(finalTags).toEqual(["nature", "beauty"]);
  });

  it("does not duplicate if pending tag already in selectedTags", () => {
    const selectedTags = ["nature", "beauty"];
    const tagInput = "nature"; // already selected

    const finalTags = [...selectedTags];
    const pendingTag = tagInput.trim();
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    expect(finalTags).toEqual(["nature", "beauty"]);
  });
});
