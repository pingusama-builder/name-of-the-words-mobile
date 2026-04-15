/**
 * Tests for the edit word feature:
 * 1. updateWord correctly persists all editable fields
 * 2. updateWord returns the updated word
 * 3. Partial updates (only some fields) work correctly
 * 4. updateWord on a non-existent id throws
 * 5. Tags are stored as JSON string after update
 */

import { describe, expect, it } from "vitest";
import { DatabaseStorage } from "./storage";

describe("updateWord via storage", () => {
  const store = new DatabaseStorage();

  // Helper: create a test word and return it
  async function createTestWord(suffix: string) {
    const now = new Date();
    return store.createWord({
      word: `edit-test-${suffix}`,
      originLanguage: "english",
      meaning: "original meaning",
      context: "original context",
      ratingEssence: 3,
      ratingBeauty: 3,
      ratingSubtlety: 3,
      tags: JSON.stringify(["original-tag"]),
      pairedWord: null,
      pairedMeaning: null,
      dateAdded: now.toISOString().split("T")[0],
      createdAt: now.toISOString(),
      userId: null,
    });
  }

  it("updateWord persists a changed meaning", async () => {
    const created = await createTestWord(`meaning-${Date.now()}`);
    const updated = await store.updateWord(created.id, { meaning: "updated meaning" });
    expect(updated.meaning).toBe("updated meaning");
    // Other fields should remain unchanged
    expect(updated.word).toBe(created.word);
  });

  it("updateWord persists changed ratings", async () => {
    const created = await createTestWord(`ratings-${Date.now()}`);
    const updated = await store.updateWord(created.id, {
      ratingEssence: 9,
      ratingBeauty: 8,
      ratingSubtlety: 7,
    });
    expect(updated.ratingEssence).toBe(9);
    expect(updated.ratingBeauty).toBe(8);
    expect(updated.ratingSubtlety).toBe(7);
  });

  it("updateWord persists changed tags as JSON string", async () => {
    const created = await createTestWord(`tags-${Date.now()}`);
    const newTags = ["new-tag-a", "new-tag-b"];
    const updated = await store.updateWord(created.id, {
      tags: JSON.stringify(newTags),
    });
    const parsed = JSON.parse(updated.tags || "[]");
    expect(parsed).toContain("new-tag-a");
    expect(parsed).toContain("new-tag-b");
    expect(parsed).not.toContain("original-tag");
  });

  it("updateWord persists a paired word", async () => {
    const created = await createTestWord(`paired-${Date.now()}`);
    const updated = await store.updateWord(created.id, {
      pairedWord: "companion",
      pairedMeaning: "they complement each other",
    });
    expect(updated.pairedWord).toBe("companion");
    expect(updated.pairedMeaning).toBe("they complement each other");
  });

  it("updateWord persists a language change", async () => {
    const created = await createTestWord(`lang-${Date.now()}`);
    const updated = await store.updateWord(created.id, { originLanguage: "cantonese" });
    expect(updated.originLanguage).toBe("cantonese");
  });

  it("updateWord returns the updated word (not stale data)", async () => {
    const created = await createTestWord(`return-${Date.now()}`);
    const updated = await store.updateWord(created.id, { meaning: "freshly updated" });
    // Verify by fetching again from DB
    const fetched = await store.getWordById(created.id);
    expect(fetched?.meaning).toBe("freshly updated");
    expect(updated.meaning).toBe(fetched?.meaning);
  });

  it("updateWord on non-existent id throws", async () => {
    await expect(store.updateWord(999999999, { meaning: "ghost" })).rejects.toThrow();
  });
});

describe("edit word tag flush logic (unit)", () => {
  it("flushes pending tagInput into final tags on save", () => {
    const selectedTags = ["existing-tag"];
    const tagInput = "new-tag"; // user typed but didn't press Enter

    const finalTags = [...selectedTags];
    const pending = tagInput.trim();
    if (pending && !finalTags.includes(pending)) finalTags.push(pending);

    expect(finalTags).toEqual(["existing-tag", "new-tag"]);
  });

  it("does not duplicate if pending tag already selected", () => {
    const selectedTags = ["existing-tag", "new-tag"];
    const tagInput = "existing-tag";

    const finalTags = [...selectedTags];
    const pending = tagInput.trim();
    if (pending && !finalTags.includes(pending)) finalTags.push(pending);

    expect(finalTags).toEqual(["existing-tag", "new-tag"]);
  });

  it("handles empty tagInput gracefully", () => {
    const selectedTags = ["existing-tag"];
    const tagInput = "   "; // whitespace only

    const finalTags = [...selectedTags];
    const pending = tagInput.trim();
    if (pending && !finalTags.includes(pending)) finalTags.push(pending);

    expect(finalTags).toEqual(["existing-tag"]);
  });
});
