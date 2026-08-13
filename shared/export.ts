import type {
  IdeaConnection,
  IdeaInstance,
  IdeaNetwork,
  IdeaNetworkPrimary,
  IdeaPrimary,
  Word,
} from "./schema";

/**
 * A word as represented in the portable JSON export. Database storage keeps
 * tags as a JSON string; the public export intentionally exposes string tags.
 */
export type ExportedWord = Omit<Word, "tags"> & {
  tags: string[];
};

export type IdeaNetworkConnection = {
  id: number;
  userId: string;
  networkIdA: number;
  networkIdB: number;
  connectionType: string | null;
  description: string | null;
  strength: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ExportedIdeas = {
  primaries: IdeaPrimary[];
  instances: IdeaInstance[];
  connections: IdeaConnection[];
  networks: IdeaNetwork[];
  networkPrimaries: IdeaNetworkPrimary[];
  networkConnections: IdeaNetworkConnection[];
};

/** The stable, portable JSON contract returned by GET /api/export/json. */
export type ExportPayload = {
  exportedAt: string;
  words: ExportedWord[];
  tags: string[];
  ideas: ExportedIdeas;
};

export function createEmptyExportedIdeas(): ExportedIdeas {
  return {
    primaries: [],
    instances: [],
    connections: [],
    networks: [],
    networkPrimaries: [],
    networkConnections: [],
  };
}
