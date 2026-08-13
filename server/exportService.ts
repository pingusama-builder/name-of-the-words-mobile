import {
  createEmptyExportedIdeas,
  type ExportPayload,
  type ExportedWord,
} from "../shared/export";
import { exportRepository } from "./exportRepository";
import { storage } from "./storage";

function parseExportedWords(words: Awaited<ReturnType<typeof storage.getAllWords>>): ExportedWord[] {
  return words.map((word) => ({
    ...word,
    tags: (() => {
      try {
        return JSON.parse(word.tags || "[]");
      } catch {
        return [];
      }
    })(),
  }));
}

/**
 * Builds the portable JSON export payload. This service intentionally owns
 * export-specific data assembly only; HTTP, authentication resolution, and
 * download headers remain in the route layer.
 */
export async function exportUserData(userId: string | undefined, isWork?: boolean): Promise<ExportPayload> {
  const words = await storage.getAllWords(userId, isWork);
  const authenticatedCollections = userId
    ? await exportRepository.getAuthenticatedCollections(userId)
    : { tags: [], ideas: createEmptyExportedIdeas() };

  return {
    exportedAt: new Date().toISOString(),
    words: parseExportedWords(words),
    tags: authenticatedCollections.tags,
    ideas: authenticatedCollections.ideas,
  };
}
