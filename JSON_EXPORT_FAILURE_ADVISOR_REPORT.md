# Authenticated JSON Export Failure — Advisor Report

**Project:** Name of the Words  
**Prepared:** 12 August 2026  
**Prepared by:** Manus AI  
**Scope:** This report concerns only the failure of **JSON export for a signed-in user’s data**. The deployment build issue is resolved and is **not** part of this diagnosis.

## Executive Summary

The user reports that clicking **Export as JSON** still produces the client message **“Failed to export JSON.”** That message is generic: the current client code displays it for any non-2xx HTTP response or request-level exception, but it discards the status code and response body. Therefore, the specific production failure has not yet been captured.[1]

The export route has a materially different authenticated branch from its unauthenticated branch. Earlier code in that branch contained two concrete server-side defects:

| Defect in prior implementation | Why it fails only for a signed-in user | Current code status |
|---|---|---|
| Called `getDb()` without `await`, then attempted `db.select(...)`. | `getDb()` is asynchronous; when `userId` is present, `db` was a `Promise`, not a Drizzle database instance. Calling `.select` would throw at runtime. | Corrected to `const db = await getDb()` with an explicit availability check. |
| Queried `tagsTable.userId` even though the global `tags` table has only `id` and `name`. | The invalid column reference is reached only in the authenticated branch after the words query. | Corrected to query the actual global `tags` table with `db.select().from(tags)`. |

Those corrections are present in the current repository version. However, they have not been conclusively validated through the **actual signed-in browser session that fails for the user**. Local requests without a session return HTTP 200 but do not execute the user-data branch; the existing test validates assembled database data but does not invoke the Express route through authentication middleware.[2] [3]

> **Current conclusion:** The original authenticated-export defects were real and have been repaired in source. The continuing user-visible failure cannot be diagnosed to a single remaining root cause until the exact response status and JSON error body from the signed-in browser request are captured. The strongest remaining possibilities are an unlogged exception inside the authenticated branch, the published application serving a version before the repair, or a session/request-context discrepancy.

## User-Facing Failure Path

The export button calls:

```ts
const response = await fetch("/api/export/json");
if (!response.ok) throw new Error("Export failed");
```

If the request is not successful, the code shows `toast.error("Failed to export JSON")`. It does not read or surface the HTTP response body, status code, request URL, or server-provided error message.[1]

This means all of the following conditions look identical to the user:

| Underlying condition | Observable UI result |
|---|---|
| A route exception returns `500` and `{ "message": "…" }`. | “Failed to export JSON” |
| A reverse proxy returns `502`, `503`, or HTML. | “Failed to export JSON” |
| The client hits an outdated deployment that still contains the earlier defect. | “Failed to export JSON” |
| A browser/network request error occurs before a response is received. | “Failed to export JSON” |

The client’s generic behavior is an **observability gap**, not proof that export data is malformed.

## Relevant Current Server Behavior

The route at `GET /api/export/json` follows this sequence.[2]

| Step | Behavior | Authenticated-only? |
|---:|---|---:|
| 1 | Resolves the OAuth user identifier via `getUserFromRequest(req)`. | No |
| 2 | Fetches words through `storage.getAllWords(userId ?? undefined, isWork)`. | The query is user-scoped when an ID is resolved. |
| 3 | Parses each word’s stored `tags` JSON string. | No |
| 4 | Initializes empty `tags` and six empty `ideas` arrays. | No |
| 5 | If `userId` exists, awaits `getDb()` and exports global tag names. | Yes |
| 6 | Queries user-scoped primary ideas, instances, idea connections, networks, and network connections. | Yes |
| 7 | Queries `ideaNetworkPrimaries` only for IDs of networks exported in step 6. | Yes |
| 8 | Sets JSON headers and returns `{ exportedAt, words, tags, ideas }`. | No |

The identity helper derives the user identifier from the request’s session cookie and returns `null` on any authentication exception.[4] Thus a sessionless probe does **not** test steps 5–7. It receives the empty ideas/tags branch instead.

## Confirmed Historical Defects and the Applied Source Repair

### 1. Unawaited asynchronous database helper

`getDb()` is declared as an `async` function and returns either a Drizzle instance or `null`.[5] The prior export code assigned it without awaiting. In the authenticated path, the next line called `.select()` on that unresolved promise. This is a deterministic runtime defect whenever the export reached the authenticated data section.

The repair now reads:

```ts
const db = await getDb();
if (!db) {
  throw new Error("Database is not available");
}
```

### 2. Invalid user-scoping assumption for the tags table

The `tags` schema contains only:

```ts
id: int(...)
name: varchar(...).notNull().unique()
```

It has no `userId` column.[6] The original export change attempted to query a `userId` property on this table. The requested export contract specified a global `tags: ["tag1", "tag2"]` array, so the current implementation correctly uses:

```ts
const allTags = await db.select().from(tags);
exportedTags = allTags.map((tag) => tag.name);
```

### 3. Route error response is not logged

The export route catches exceptions and returns:

```ts
res.status(500).json({ message: error.message });
```

It does **not** log the exception. Consequently, production runtime logs examined during this investigation contained startup entries and sessionless-request notices, but no export exception stack trace. This absence does not prove the route did not fail; the error is intentionally returned to the client without server-side logging.[2]

## Evidence Collected

| Evidence | Result | Interpretation |
|---|---|---|
| Local unauthenticated `GET /api/export/json` | HTTP 200; response has `exportedAt`, `words`, `tags`, and six `ideas` arrays. | Confirms the unauthenticated branch and output envelope only. It does not execute user-data queries. |
| Focused test: `pnpm exec vitest run server/export.test.ts --reporter=dot` | Passed: 2 tests. | Confirms the tested tables and expected shape can be assembled against the database; it does not call the Express handler or inject an authenticated cookie. |
| Local production build | Passed. | Export failure is not a client compilation failure. |
| Production runtime logs inspected after sessionless probes | Only `[Auth] Missing session cookie`; no export exception stack trace. | The tested requests were not authenticated, and current route catch behavior hides errors from server logs. |
| Current source inspection | The two authenticated-branch defects above are fixed in source. | Source correctness is improved, but the active published version/session request still requires direct verification. |

## What Has **Not** Been Proven

The following distinction is important for an advisor review.

| Statement | Status | Reason |
|---|---|---|
| The current source can export data for the affected user through a real authenticated browser request. | **Not proven.** | The affected user’s session was not available for direct testing. |
| The published application is serving the checkpoint that contains the awaited database fix and tags-table correction. | **Not proven.** | A deployment/version-to-browser verification was not captured as part of the export investigation. |
| The current UI receives a `500` response. | **Not proven.** | The UI drops the actual status/body. |
| The failure originates in Ideas Mode table queries. | **Not proven.** | It is a reasonable suspect because they run only when signed in, but no error body identifies a failing table/query. |
| The failure is related to deployment tooling. | **Out of scope / unsupported.** | Deployment is resolved, and current evidence concerns an HTTP request after the app is running. |

## Remaining Root-Cause Candidates

The advisor should treat these as hypotheses, ordered by diagnostic value rather than certainty.

| Priority | Candidate | Rationale | Fastest discriminating observation |
|---:|---|---|---|
| 1 | The live app is serving a version from before the export repair. | The user still sees the historical symptom; source repairs do not affect the browser until the matching version is published and active. | Identify the live release/checkpoint and compare its `server/routes.ts` export handler to the repair. |
| 2 | A new exception occurs in one of the authenticated idea/network queries. | These tables are queried only after successful user resolution and expand the export path substantially. | Capture the JSON body of the failed response; it currently contains `message: error.message`. |
| 3 | `getDb()` resolves `null` in the production request context. | The current code explicitly throws `Database is not available` in this case. | Inspect failed response body and runtime configuration/database initialization. |
| 4 | The browser session differs from the expected same-origin authenticated session. | User ID comes exclusively from the session cookie. | Record request cookies/session state and compare `/api/words` versus `/api/export/json` under the same session. |
| 5 | A gateway/proxy failure occurs before Express receives the request. | The UI renders the same generic toast for any non-2xx response. | Network panel: response status, headers, and whether the body is application JSON. |

## Recommended Immediate Diagnostic Procedure

The next investigation should begin with the actual affected user’s session, not another unauthenticated `curl` request.

### Step 1 — Capture the exact request outcome in the signed-in browser

While signed in as the affected user, open the browser developer tools, select **Network**, click **Export as JSON**, and record:

| Field to capture | Why it matters |
|---|---|
| Request URL and method | Confirms same-origin path and query string. |
| HTTP status | Separates route exception from gateway/network failure. |
| Response headers | Confirms whether Express returned JSON or an intermediary returned HTML. |
| Response body | The server’s current route returns `{ "message": error.message }` on a caught exception. |
| Timing/waterfall | Highlights immediate application errors versus proxy timeouts. |

An equivalent one-time console probe, executed **while signed in on the live app origin**, is:

```js
const response = await fetch('/api/export/json');
console.log({ status: response.status, headers: [...response.headers.entries()] });
console.log(await response.text());
```

This is diagnostic only; it does not modify user data.

### Step 2 — Add temporary server-side exception logging if the response is insufficient

If the response body is absent, masked, or produced by a proxy, add structured logging in the route catch before returning the 500:

```ts
console.error("[Export JSON]", {
  userId,
  error: error instanceof Error ? error.stack ?? error.message : String(error),
});
```

This should be treated as a short, focused observability change. It must not log words, tags, idea content, cookies, or the entire export payload. The user identifier can be omitted or hashed if privacy policy requires it.

### Step 3 — Isolate the failing data group if the response names a query/table error

If a response points to an Ideas Mode table, test the authenticated export in this sequence: words only, then tags, then primaries, instances, connections, networks, network connections, and junction rows. The first failing query determines whether the problem is missing schema, a column mismatch, malformed legacy data, or an ownership filter issue.

### Step 4 — Improve the UI error state permanently

The UI should not collapse all export errors into the same toast. It should preserve the generic user-facing copy while logging or displaying a safe diagnostic code/status. For example:

```ts
if (!response.ok) {
  const body = await response.text();
  console.error("JSON export failed", { status: response.status, body });
  throw new Error(`Export failed (${response.status})`);
}
```

For a production-facing implementation, avoid putting raw database or server messages in a toast. A status code and a short support reference are sufficient.

## Test Coverage Gap

The present `server/export.test.ts` is useful but limited. It creates isolated database records, queries them directly with Drizzle, and asserts the intended JSON object shape.[3] It does **not**:

| Missing coverage | Why it matters |
|---|---|
| Invoke `registerRoutes` and the `/api/export/json` handler. | The route’s `await getDb()` behavior and its exception handling are not exercised. |
| Mock or inject an authenticated request/session. | The user-data branch is the branch that was historically defective. |
| Assert response status and headers. | The downloadable browser behavior is part of the failure surface. |
| Simulate a null database or one failing Ideas Mode query. | The client needs predictable, diagnosable failures. |

The advisor should add an HTTP-level test with mocked `getUserFromRequest`, `storage.getAllWords`, and `getDb`, then assert both a successful signed-in export and an intentional query failure. This would prevent regression of the unawaited-database pattern.

## Advisor Decision Framework

| If the signed-in Network response shows… | Then the likely action is… |
|---|---|
| `500` with `"Database is not available"` | Inspect production database environment injection and database initialization. |
| `500` naming an idea/network table or column | Compare production schema to `drizzle/schema.ts`; apply the missing schema migration or correct the query. |
| `500` saying `.select is not a function` or referring to a Promise | The live app is serving a version before the `await getDb()` fix; publish/activate the correct version. |
| `200` with valid JSON but no download | Investigate browser download policy, Content-Disposition handling, or front-end blob logic—not data export. |
| `401`/`403` or unexpected missing-session behavior | Investigate OAuth cookie scope, origin, and session state. |
| `502`/`503` or HTML error page | Investigate runtime gateway/proxy behavior; Express route may not be reached. |

## Final Assessment

The initial authenticated-only failure had two identified source-level causes: an unawaited database helper and an invalid `tags.userId` query. Both are repaired in the present code. The remaining user-visible toast is insufficient evidence to claim that either repair is ineffective, because the toast does not report status or server error details and no authenticated end-to-end request has been captured after the repair.

The next correct action is to capture one failed signed-in request’s **status and response body**. That single observation should determine whether to publish the correct application version, fix a database/schema mismatch, correct session behavior, or investigate a non-application network failure. Deployment tooling should not be included in this export-specific diagnosis.

## References

[1]: ./client/src/components/ExportImport.tsx "Client JSON export request and generic failure toast"
[2]: ./server/routes.ts "GET /api/export/json handler"
[3]: ./server/export.test.ts "Current direct-Drizzle export shape tests"
[4]: ./server/_core/auth-helper.ts "Session-cookie user identity helper"
[5]: ./server/db.ts "Asynchronous getDb helper"
[6]: ./shared/schema.ts "Global tags schema"
