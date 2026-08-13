import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ideaConnections,
  ideaInstances,
  ideaNetworkConnections,
  ideaNetworkPrimaries,
  ideaNetworks,
  ideaPrimaries,
  tags,
} from "../drizzle/schema";
import type { ExportPayload } from "../shared/export";

const mocks = vi.hoisted(() => ({
  getUserFromRequest: vi.fn(),
  getAllWords: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./_core/auth-helper", () => ({
  getUserFromRequest: mocks.getUserFromRequest,
}));

vi.mock("./storage", () => ({
  storage: {
    getAllWords: mocks.getAllWords,
  },
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("./sharedDecks", () => ({
  sharedDeckStorage: {
    createDeck: vi.fn(),
    getDeckByToken: vi.fn(),
    getDecksByOwner: vi.fn(),
    deleteDeck: vi.fn(),
    listDecks: vi.fn(),
    getDeck: vi.fn(),
  },
}));

import { registerRoutes } from "./routes";

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Test server did not expose a TCP port");
      }
      resolve(address.port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function createMockDatabase(rowsByTable: Map<unknown, unknown[]>) {
  const select = vi.fn(() => ({
    from(table: unknown) {
      const result = Promise.resolve(rowsByTable.get(table) ?? []);
      return {
        where: vi.fn(() => result),
        then: result.then.bind(result),
        catch: result.catch.bind(result),
      };
    },
  }));

  return { select };
}

describe("GET /api/export/json", () => {
  let server: Server;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.getUserFromRequest.mockReset();
    mocks.getAllWords.mockReset();
    mocks.getDb.mockReset();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    consoleError.mockRestore();
    if (server?.listening) await close(server);
  });

  async function requestExport() {
    const app = express();
    server = createServer(app);
    await registerRoutes(server, app);
    const port = await listen(server);
    return fetch(`http://127.0.0.1:${port}/api/export/json`);
  }

  it("exports the full authenticated contract through the HTTP route", async () => {
    const authenticatedUserId = "authenticated-test-user";
    mocks.getUserFromRequest.mockResolvedValue(authenticatedUserId);
    mocks.getAllWords.mockResolvedValue([
      {
        id: 101,
        word: "sonder",
        originLanguage: "english",
        tags: '["literature"]',
      },
    ]);

    const primary = { id: 11, userId: authenticatedUserId, term: "solitude" };
    const network = { id: 21, userId: authenticatedUserId, title: "Inner Life" };
    const rowsByTable = new Map<unknown, unknown[]>([
      [tags, [{ id: 1, name: "literature" }]],
      [ideaPrimaries, [primary]],
      [ideaInstances, [{ id: 31, userId: authenticatedUserId, ideaPrimaryId: primary.id }]],
      [ideaConnections, [{ id: 41, userId: authenticatedUserId, ideaPrimaryIdA: primary.id, ideaPrimaryIdB: 12 }]],
      [ideaNetworks, [network]],
      [ideaNetworkConnections, [{ id: 51, userId: authenticatedUserId, networkIdA: network.id, networkIdB: 22 }]],
      [ideaNetworkPrimaries, [{ id: 61, networkId: network.id, ideaPrimaryId: primary.id, isCentral: 1 }]],
    ]);
    const db = createMockDatabase(rowsByTable);
    mocks.getDb.mockResolvedValue(db);

    const response = await requestExport();
    const body: ExportPayload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("name-of-the-words.json");
    expect(mocks.getUserFromRequest).toHaveBeenCalledTimes(1);
    expect(mocks.getAllWords).toHaveBeenCalledWith(authenticatedUserId, undefined);
    expect(mocks.getDb).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      exportedAt: expect.any(String),
      words: [expect.objectContaining({ id: 101, tags: ["literature"] })],
      tags: ["literature"],
      ideas: {
        primaries: [primary],
        instances: [expect.objectContaining({ id: 31 })],
        connections: [expect.objectContaining({ id: 41 })],
        networks: [network],
        networkPrimaries: [expect.objectContaining({ id: 61 })],
        networkConnections: [expect.objectContaining({ id: 51 })],
      },
    });
  });

  it("returns a safe diagnostic response and records authenticated export context when a query fails", async () => {
    mocks.getUserFromRequest.mockResolvedValue("authenticated-test-user");
    mocks.getAllWords.mockResolvedValue([]);
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => {
        throw new Error("simulated export query failure");
      }),
    });

    const response = await requestExport();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).toEqual({
      message: "JSON export failed",
      operationId: expect.stringMatching(/^json-export-/),
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[Export JSON] failed",
      expect.objectContaining({
        operationId: body.operationId,
        authenticatedUserResolved: true,
        errorMessage: "simulated export query failure",
      }),
    );
  });

  it("returns the intentional anonymous contract without accessing authenticated export tables", async () => {
    mocks.getUserFromRequest.mockResolvedValue(null);
    mocks.getAllWords.mockResolvedValue([]);

    const response = await requestExport();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(mocks.getAllWords).toHaveBeenCalledWith(undefined, undefined);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      exportedAt: expect.any(String),
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
    });
  });
});
