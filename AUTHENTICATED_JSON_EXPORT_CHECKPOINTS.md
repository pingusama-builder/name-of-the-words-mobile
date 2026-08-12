# Authenticated JSON Export — Execution Checkpoints

## CHECKPOINT 0 — BASELINE

**Current export route:** `server/routes.ts` → `registerRoutes()` → `GET /api/export/json`.

**Current client export handler:** `client/src/components/ExportImport.tsx` → `handleExportJSON()`.

**Authentication helper:** `server/_core/auth-helper.ts` → `getUserFromRequest(req)`, which reads the OAuth session through `sdk.authenticateRequest(req)` and returns the authenticated user’s `openId` or `null`.

**Database helper:** `server/db.ts` → asynchronous `getDb()`, which resolves to a Drizzle database instance or `null`.

**Current export tests:** `server/export.test.ts` → `exports words, global tags, ideas, and network junction rows`; `returns empty tags and idea arrays for an unauthenticated export`.

**Browser-to-response execution path:**

1. `handleExportJSON()` issues same-origin `fetch("/api/export/json")`.
2. On a successful response, the client reads a blob, creates a temporary object URL, and initiates a file download.
3. `GET /api/export/json` resolves a session user ID, fetches words, and parses each word’s tag JSON.
4. When a user is authenticated, the route opens the database connection; exports global tag names; then exports user-scoped idea primaries, instances, connections, networks, network connections, and network junction rows.
5. The route responds with `{ exportedAt, words, tags, ideas }` and download headers.

**Historical `await getDb()` defect:** **FIXED.** The route currently uses `const db = await getDb()` and explicitly rejects a missing database instance.

**Historical `tags.userId` defect:** **FIXED.** The route queries `db.select().from(tags)`; the current `tags` schema has only `id` and `name`.

**Authenticated-only operations observed:**

- Awaiting and validating the database helper.
- Exporting the global tags list.
- Querying `ideaPrimaries` by `userId`.
- Querying `ideaInstances` by `userId`.
- Querying `ideaConnections` by `userId`.
- Querying `ideaNetworks` by `userId`.
- Querying `ideaNetworkConnections` by `userId`.
- Querying `ideaNetworkPrimaries` with the authenticated user’s exported network IDs.

**No application-code changes made in Checkpoint 0:** **YES.**
