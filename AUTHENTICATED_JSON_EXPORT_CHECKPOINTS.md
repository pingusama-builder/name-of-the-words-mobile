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

## CHECKPOINT 1 — OBSERVABILITY

**Files changed:**

- `server/routes.ts`
- `client/src/components/ExportImport.tsx`
- `server/export-observability.test.ts`
- `AUTHENTICATED_JSON_EXPORT_CHECKPOINTS.md`

**Server now records:**

- A per-request JSON export operation identifier.
- Whether an authenticated user was resolved, as a boolean only.
- The error message.
- A short stack-trace excerpt when available.

The server returns a safe JSON failure response with a generic message and the operation identifier. Raw exception details no longer travel to the browser response.

**Client now records for non-2xx responses:**

- HTTP status and status text.
- Response content type.
- A safely parsed JSON body or a text preview capped at 1,000 characters.
- The server operation identifier when it is included in the response body.

The client keeps the existing generic user-facing toast: `Failed to export JSON`.

**Sensitive information intentionally excluded:**

- Cookies and session tokens.
- User identifiers.
- Exported words, tags, ideas, instances, and payload contents.
- Raw database exception text in the browser response or user-facing toast.

**Validation commands:**

```text
pnpm exec vitest run server/export.test.ts server/export-observability.test.ts --reporter=dot
pnpm run build
pnpm run check
```

**Validation result:**

- **PASS:** 3 focused export tests passed across 2 test files.
- **PASS:** Production build completed successfully.
- **UNDERSTOOD PRE-EXISTING FAILURE:** The project-wide `pnpm run check` still reports existing `server/routes.ts` interface/signature errors outside the export handler, including missing storage/shared-deck methods. It reports no errors in `client/src/components/ExportImport.tsx`, the export handler’s changed lines, or `server/export-observability.test.ts`.

**Commit/checkpoint identifier:** Recorded in the accompanying Checkpoint 1 save operation.
