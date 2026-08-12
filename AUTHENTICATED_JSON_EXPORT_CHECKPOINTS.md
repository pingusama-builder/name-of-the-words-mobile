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

## CHECKPOINT 2 — REPRODUCTION

**Authenticated request successfully exercised:** **YES.** The deployed application was opened in the authenticated account session and the JSON export control was triggered. The endpoint was then opened directly in that same signed-in browser session.

**HTTP status:** **500 Internal Server Error.** The route’s authenticated exception path explicitly returns `res.status(500)`, and the signed-in endpoint rendered the corresponding JSON error response.

**Content-Type:** `application/json`. The signed-in browser rendered the returned JSON response through its JSON viewer.

**Response body/error:**

```json
{
  "message": "JSON export failed",
  "operationId": "json-export-mspzpp01-baaig6"
}
```

**Authenticated user resolved:** **YES.** The correlated server diagnostic event records `authenticatedUserResolved: true`.

**Express export handler reached:** **YES.** The operation identifier was issued by `GET /api/export/json` and appeared in its server log.

**Server exception:**

```text
Table 'ogafsucxrmwdwsgub9qpfn.idea_network_connections' doesn't exist
```

**First failing operation:** The authenticated branch’s query of `ideaNetworkConnections` failed because the production database does not contain the `idea_network_connections` table.

**Classification:** **A — application/query exception.**

**Evidence-supported root-cause hypothesis:** The export handler is correct to query `idea_network_connections`, but the deployed database schema is missing that Ideas Mode table. The failed query prevents the route from returning the otherwise valid export payload.

**Still unproven:**

- Whether `idea_network_connections` is the only missing Ideas Mode table in the production database.
- Whether the expected schema migration was never applied, was applied to another database, or failed silently.
- Whether any subsequent export query will reveal a further schema mismatch after this table is created.

**No root-cause fix was applied in Checkpoint 2:** **YES.**

## CHECKPOINT 3 — ROOT-CAUSE FIX

**Observed root cause:** The production database did not contain `idea_network_connections`, despite that table being defined in `drizzle/schema.ts` and required by the authenticated JSON export route.

**Why this caused the failure:** The export handler queries `ideaNetworkConnections` after exporting the other Ideas Mode records. MySQL rejected that query because the underlying table did not exist, and the route returned HTTP 500 before producing the export payload.

**Files changed:**

- `AUTHENTICATED_JSON_EXPORT_CHECKPOINTS.md`
- `todo.md`

**Smallest fix applied:** Created the single missing `idea_network_connections` table in the production database. Its columns, unique constraint, and three indexes match the existing Drizzle definition.

**Migration note:** `pnpm db:push` was run first but did not apply the existing migration because the local Drizzle migration snapshot reported no new schema changes. It then exited during migration. After confirming that the database contained the other five Ideas Mode tables but not this one, the exact table definition was applied as a single schema migration through the database migration interface.

**Authenticated reproduction before fix:** HTTP 500 with `JSON export failed`; server exception: `Table 'ogafsucxrmwdwsgub9qpfn.idea_network_connections' doesn't exist`.

**Authenticated reproduction after fix:** The same signed-in account used the in-app **Export as JSON** control successfully. The application showed the success message **“Words exported as JSON”** and initiated the download. No subsequent export exception was logged.

**Unrelated changes intentionally avoided:**

- No export-query refactor.
- No authentication changes.
- No modification of existing Ideas Mode data.
- No application-code changes to the export payload contract.

**Commit/checkpoint identifier:** Recorded in the accompanying Checkpoint 3 save operation.

## CHECKPOINT 4 — REGRESSION PROTECTION

**Tests added or expanded:** `server/export-observability.test.ts` now exercises the HTTP route boundary for three required states.

| Test | Coverage |
|---|---|
| Authenticated success | Asserts HTTP 200, JSON content type, download header, full top-level export contract, parsed word tags, authenticated database access, and all six Ideas Mode arrays. |
| Controlled authenticated failure | Forces an export query exception and asserts HTTP 500, the safe error response shape, an operation identifier, and correlated server diagnostics. |
| Authentication state | Uses an anonymous request and asserts the intended empty tags/ideas contract without database access to authenticated export tables. |

**Validation commands:**

```text
pnpm exec vitest run server/export.test.ts server/export-observability.test.ts --reporter=dot
pnpm run build
pnpm run check
```

**Validation result:**

- **PASS:** 5 export tests passed across 2 test files.
- **PASS:** Production build completed successfully.
- **UNDERSTOOD PRE-EXISTING FAILURE:** `pnpm run check` remains non-zero because of existing storage/shared-deck interface errors in unrelated portions of `server/routes.ts`. It reported no errors in `server/export-observability.test.ts`, `server/export.test.ts`, `client/src/components/ExportImport.tsx`, or the changed export route section.

**Authenticated success covered:** **YES.**

**Controlled failure covered:** **YES.**

**Authentication state covered:** **YES.**

**Commit/checkpoint identifier:** Recorded in the accompanying Checkpoint 4 save operation.
