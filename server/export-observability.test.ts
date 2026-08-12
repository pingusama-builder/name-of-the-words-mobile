import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("GET /api/export/json diagnostics", () => {
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

  it("returns a safe diagnostic response and records authenticated export context when a query fails", async () => {
    mocks.getUserFromRequest.mockResolvedValue("authenticated-test-user");
    mocks.getAllWords.mockResolvedValue([]);
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => {
        throw new Error("simulated export query failure");
      }),
    });

    const app = express();
    server = createServer(app);
    await registerRoutes(server, app);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/api/export/json`);
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
});
