import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function ensureTables() {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    // Use raw SQL via the underlying connection to create tables if missing
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);
    await conn.execute(`CREATE TABLE IF NOT EXISTS words (
      id INT AUTO_INCREMENT PRIMARY KEY,
      word VARCHAR(255) NOT NULL,
      origin_language VARCHAR(64) NOT NULL,
      meaning TEXT,
      context TEXT,
      rating_essence INT DEFAULT 0,
      rating_beauty INT DEFAULT 0,
      rating_subtlety INT DEFAULT 0,
      tags TEXT,
      paired_word VARCHAR(255),
      paired_meaning TEXT,
      date_added VARCHAR(32) NOT NULL,
      created_at VARCHAR(64) NOT NULL
    )`);
    await conn.execute(`CREATE TABLE IF NOT EXISTS tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    )`);
    await conn.end();
    console.log("[DB] Tables ensured");
  } catch (e) {
    console.error("[DB] Failed to ensure tables:", e);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Ensure words/tags tables exist (runs on every startup, safe with IF NOT EXISTS)
  await ensureTables();
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Register original REST API routes for words/tags
  const { registerRoutes } = await import("../routes");
  await registerRoutes(server, app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
