# Ideas Mode: Technical Specification (v2 — Revised)

## Executive Summary

This document specifies **Ideas Mode**, a new feature for Name of the Words inspired by Mortimer Adler's analytical reading methodology. It incorporates critical bug fixes and data integrity improvements identified during design review.

**Key changes from v1:**
- Fixed asymmetric connection uniqueness bug (normalize direction)
- Fixed stale foreign key references (use junction table)
- Extended API to allow editing all instance fields
- Added security validation for word ownership
- Defined location order extraction logic
- Added date format validation
- Clarified app scale and use case context

---

## Part 1: App Context & Scale

### Current State

**Name of the Words** is a personal-scale, single-user word collection app. Key characteristics:

| Aspect | Current State |
|--------|---------------|
| **User Base** | Individual users (researchers, language enthusiasts, readers) |
| **Collection Size** | Typical user: 50–500 words; power users: up to 1,000–2,000 |
| **Data Isolation** | Strict per-user (each user sees only their own words) |
| **Architecture** | Single-tenant (each user's data is isolated via `userId` filter) |
| **Query Pattern** | Simple, full-table scans with client-side filtering (no pagination) |
| **Performance Baseline** | Optimized for <1,000 words per user; queries complete in <100ms |
| **Deployment** | Stateless serverless (CloudRun); no persistent state between requests |

### Use Case

Users collect words from books, articles, conversations, and media. They rate each word across three dimensions (Essence, Beauty, Subtlety), organize by source, and explore through multiple lenses (calendar, tags, sources). The app is designed for **slow, deliberate engagement**—not high-throughput data entry.

### Scaling Implications for Ideas Mode

**Ideas Mode adds a new dimension:** Instead of just collecting words, users now trace how concepts evolve across sources. A typical Ideas Mode workflow:

1. Read *Blink* by Gladwell → encounter "thin-slicing"
2. Create Primary Idea: "thin-slicing"
3. Add instances from *Blink* (3–5 occurrences across chapters)
4. Later, read *Thinking, Fast and Slow* → add instances of "thin-slicing" from that source
5. Create connection: "thin-slicing" ↔ "thick-slicing" (contrast)
6. Build network: "Blink Analysis" with 8–12 related ideas

**Expected scale for Ideas Mode:**
- **Primary Ideas per user:** 20–100 (one per major concept being tracked)
- **Instances per idea:** 3–10 (occurrences across sources)
- **Connections per network:** 5–20 (relationships between ideas)
- **Networks per user:** 2–10 (one per book/research project)

**Pagination is not required** for Phase 1. If users accumulate 500+ ideas, pagination becomes necessary—but that's a future optimization.

---

## Part 2: Core Concept

### The Problem Ideas Mode Solves

In analytical reading, understanding a text requires identifying key terms and understanding how they work individually and collectively within an argument. Most note-taking apps capture quotes but don't help you trace how a single concept evolves across a text or across multiple texts.

Ideas Mode operationalizes Adler's approach by enabling users to:

1. **Identify** key terms, concepts, or arguments (Primary Ideas)
2. **Track** specific occurrences of that idea across different contexts and sources (Instances)
3. **Connect** related ideas to show how concepts interact and support each other (Connections)
4. **Visualize** the full network of ideas and their relationships (Networks)

### Example: *Blink* by Malcolm Gladwell

**Primary Idea 1: "Thin-slicing"**
- Instance 1: "The ability to make accurate judgments based on minimal information" (Ch. 1, p. 23)
- Instance 2: "Snap judgments made by art experts in milliseconds" (Ch. 2, p. 45)
- Instance 3: "Speed dating participants' ability to assess compatibility instantly" (Ch. 4, p. 89)

**Primary Idea 2: "Thick-slicing"**
- Instance 1: "Deliberate, conscious analysis requiring extended time" (Ch. 1, p. 25)
- Instance 2: "Traditional scientific method of hypothesis testing" (Ch. 3, p. 67)

**Connection:** "Thin-slicing" vs. "Thick-slicing" — contrasting epistemological approaches

---

## Part 3: Database Schema

### New Tables

#### 1. `idea_primaries` Table

Stores the primary concepts/terms that users want to track across contexts.

```sql
CREATE TABLE idea_primaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  term VARCHAR(255) NOT NULL,
  description TEXT,
  originLanguage VARCHAR(64) DEFAULT 'english',
  createdAt VARCHAR(64) NOT NULL,
  updatedAt VARCHAR(64) NOT NULL,
  color VARCHAR(16),
  primarySource VARCHAR(512),
  posX FLOAT,
  posY FLOAT,
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (userId),
  INDEX (createdAt)
);
```

**Columns:**
- `id`: Unique identifier
- `userId`: Owner (Manus OAuth openId) for data isolation
- `term`: The key term or concept (e.g., "thin-slicing")
- `description`: Optional user-defined description
- `originLanguage`: Language of the term
- `createdAt`, `updatedAt`: ISO datetime strings
- `color`: Auto-generated hex color for visual identity
- `primarySource`: Optional default source where this idea originates
- `posX`, `posY`: Position in graph visualization (for Phase 3; initially NULL)

#### 2. `idea_instances` Table

Stores specific occurrences of a Primary Idea in different contexts, sources, or with different meanings.

```sql
CREATE TABLE idea_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ideaPrimaryId INT NOT NULL,
  userId VARCHAR(128) NOT NULL,
  wordId INT,
  context TEXT NOT NULL,
  source VARCHAR(512),
  location VARCHAR(255),
  locationOrder INT,
  meaning TEXT,
  interpretation TEXT,
  dateEncountered VARCHAR(32),
  createdAt VARCHAR(64) NOT NULL,
  updatedAt VARCHAR(64) NOT NULL,
  FOREIGN KEY (ideaPrimaryId) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  FOREIGN KEY (wordId) REFERENCES words(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (ideaPrimaryId),
  INDEX (userId),
  INDEX (wordId)
);
```

**Columns:**
- `id`: Unique identifier
- `ideaPrimaryId`: Foreign key to `idea_primaries`
- `userId`: Owner for data isolation
- `wordId`: Optional link to a word entry (if this instance is also a saved word)
- `context`: The sentence or passage where this instance appears
- `source`: Book title, article, etc.
- `location`: Page number, chapter, timestamp, etc.
- `locationOrder`: Auto-extracted integer for sorting (see Issue 5 fix)
- `meaning`: How the term is used in this specific context
- `interpretation`: User's notes on what this instance reveals
- `dateEncountered`: ISO date string (YYYY-MM-DD format, validated by Zod)
- `createdAt`, `updatedAt`: ISO datetime strings

#### 3. `idea_connections` Table

Stores relationships between Primary Ideas.

```sql
CREATE TABLE idea_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  ideaPrimaryIdA INT NOT NULL,
  ideaPrimaryIdB INT NOT NULL,
  connectionType VARCHAR(64),
  description TEXT,
  strength INT DEFAULT 5,
  createdAt VARCHAR(64) NOT NULL,
  updatedAt VARCHAR(64) NOT NULL,
  FOREIGN KEY (ideaPrimaryIdA) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  FOREIGN KEY (ideaPrimaryIdB) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (userId),
  INDEX (ideaPrimaryIdA),
  INDEX (ideaPrimaryIdB),
  UNIQUE KEY (userId, ideaPrimaryIdA, ideaPrimaryIdB),
  CHECK (ideaPrimaryIdA < ideaPrimaryIdB)
);
```

**Columns:**
- `id`: Unique identifier
- `userId`: Owner for data isolation
- `ideaPrimaryIdA`, `ideaPrimaryIdB`: The two connected ideas (always stored with A < B)
- `connectionType`: Enum string: `contrast`, `supports`, `contradicts`, `precedes`, `enables`
- `description`: User notes on how the ideas relate
- `strength`: 1–10 scale indicating connection strength
- `createdAt`, `updatedAt`: ISO datetime strings

**Critical Fix (Issue 1):** The `CHECK (ideaPrimaryIdA < ideaPrimaryIdB)` constraint ensures that connections are always stored in a canonical direction. Combined with normalization in the storage layer (see below), this prevents duplicate edges like `(A, B)` and `(B, A)`.

#### 4. `idea_network_primaries` Table (Junction Table)

Links Primary Ideas to Networks with proper referential integrity.

```sql
CREATE TABLE idea_network_primaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  networkId INT NOT NULL,
  ideaPrimaryId INT NOT NULL,
  FOREIGN KEY (networkId) REFERENCES idea_networks(id) ON DELETE CASCADE,
  FOREIGN KEY (ideaPrimaryId) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  UNIQUE KEY (networkId, ideaPrimaryId),
  INDEX (networkId),
  INDEX (ideaPrimaryId)
);
```

**Critical Fix (Issue 2):** Replaces the JSON column with a proper junction table. When a Primary Idea is deleted, the `ON DELETE CASCADE` automatically removes it from all networks. No stale references.

#### 5. `idea_networks` Table

Stores named collections of related Primary Ideas.

```sql
CREATE TABLE idea_networks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  primarySource VARCHAR(512),
  createdAt VARCHAR(64) NOT NULL,
  updatedAt VARCHAR(64) NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (userId),
  INDEX (createdAt)
);
```

**Columns:**
- `id`: Unique identifier
- `userId`: Owner
- `title`: Name of the network (e.g., "Blink Analysis")
- `description`: Optional description
- `primarySource`: The primary source being analyzed (renamed from `source` for clarity; see Issue 11 fix)
- `createdAt`, `updatedAt`: ISO datetime strings

**Critical Fix (Issue 11):** Renamed `source` to `primarySource` to clarify that networks can span multiple sources. Documentation now states: *"Primary source (optional) — the main text this network analyzes. Networks can span multiple sources."*

---

## Part 4: Data Model & Relationships

```
User (users.openId)
  ├── idea_primaries (1:N)
  │   ├── idea_instances (1:N)
  │   │   └── words (0:1) [optional link]
  │   └── idea_connections (N:M via ideaPrimaryIdA/B)
  ├── idea_networks (1:N)
  │   └── idea_network_primaries (N:M junction)
  │       └── idea_primaries (N:1)
  └── idea_connections (1:N)
```

### Design Rationale

**Why separate `idea_primaries` and `idea_instances`?**
A Primary Idea may appear in many contexts with subtly different meanings or implications. Separating them allows users to track how an idea evolves or manifests differently across sources. For example, "thin-slicing" in *Blink* appears in art expertise, speed dating, and military contexts—each instance reveals something different about the core concept.

**Why optional `wordId` link in `idea_instances`?**
Some instances may already be saved as words in the user's collection. The optional link allows ideas to reference existing words without forcing duplication. A user can capture a word, then later realize it's an instance of a broader Primary Idea and link it retroactively.

**Why junction table for `idea_network_primaries`?**
The original design used JSON to store idea IDs in `idea_networks`. This breaks referential integrity—when a Primary Idea is deleted, its ID lingers in the JSON array, causing `getNetworkWithDetails` to return undefined entries. A junction table ensures that deletions cascade automatically.

**Why normalize connection direction?**
Connections are bidirectional relationships (e.g., "contrast" works both ways). Without normalization, inserting `(A, B)` and then `(B, A)` creates two distinct rows, resulting in duplicate edges in the graph. Normalizing to always store the smaller ID in column A prevents this.

---

## Part 5: API Design

### Storage Layer (`server/storage.ts` Extensions)

```typescript
export interface IIdeaStorage {
  // Primary Ideas
  createPrimaryIdea(userId: string, idea: {
    term: string;
    description?: string;
    originLanguage?: string;
    primarySource?: string;
  }): Promise<IdeaPrimary>;

  getPrimaryIdea(id: number, userId: string): Promise<IdeaPrimary | undefined>;

  getAllPrimaryIdeas(userId: string): Promise<IdeaPrimary[]>;

  updatePrimaryIdea(id: number, userId: string, updates: Partial<{
    term: string;
    description: string;
    primarySource: string;
    posX: number;
    posY: number;
  }>): Promise<IdeaPrimary>;

  deletePrimaryIdea(id: number, userId: string): Promise<void>;

  // Instances
  createInstance(userId: string, instance: {
    ideaPrimaryId: number;
    wordId?: number;
    context: string;
    source?: string;
    location?: string;
    meaning?: string;
    interpretation?: string;
    dateEncountered?: string;
  }): Promise<IdeaInstance>;

  getInstancesByPrimaryIdea(ideaPrimaryId: number, userId: string): Promise<IdeaInstance[]>;

  updateInstance(id: number, userId: string, updates: Partial<{
    context: string;
    source: string;        // ← NEW (Issue 3)
    location: string;      // ← NEW (Issue 3)
    meaning: string;
    interpretation: string;
    dateEncountered: string; // ← NEW (Issue 3)
  }>): Promise<IdeaInstance>;

  deleteInstance(id: number, userId: string): Promise<void>;

  // Connections
  createConnection(userId: string, connection: {
    ideaPrimaryIdA: number;
    ideaPrimaryIdB: number;
    connectionType?: string;
    description?: string;
    strength?: number;
  }): Promise<IdeaConnection>;

  getConnectionsForIdea(ideaPrimaryId: number, userId: string): Promise<IdeaConnection[]>;

  updateConnection(id: number, userId: string, updates: Partial<{
    connectionType: string;
    description: string;
    strength: number;
  }>): Promise<IdeaConnection>;

  deleteConnection(id: number, userId: string): Promise<void>;

  // Networks
  createNetwork(userId: string, network: {
    title: string;
    description?: string;
    primarySource?: string;
    ideaPrimaryIds: number[];
  }): Promise<IdeaNetwork>;

  getNetwork(id: number, userId: string): Promise<IdeaNetwork | undefined>;

  getAllNetworks(userId: string): Promise<IdeaNetwork[]>;

  updateNetwork(id: number, userId: string, updates: Partial<{
    title: string;
    description: string;
    primarySource: string;
    ideaPrimaryIds: number[];
  }>): Promise<IdeaNetwork>;

  deleteNetwork(id: number, userId: string): Promise<void>;

  // Aggregations
  getNetworkWithDetails(networkId: number, userId: string): Promise<{
    network: IdeaNetwork;
    ideas: IdeaPrimary[];
    instances: Record<number, IdeaInstance[]>;
    connections: IdeaConnection[];
  }>;
}
```

### Key Implementation Details

#### Issue 1 Fix: Normalize Connection Direction

```typescript
async createConnection(userId: string, connection: {
  ideaPrimaryIdA: number;
  ideaPrimaryIdB: number;
  connectionType?: string;
  description?: string;
  strength?: number;
}): Promise<IdeaConnection> {
  const db = await getDb();

  // Normalize direction: always store smaller ID in column A
  const [idA, idB] = [connection.ideaPrimaryIdA, connection.ideaPrimaryIdB]
    .sort((x, y) => x - y);

  if (idA === idB) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot create connection from an idea to itself",
    });
  }

  return db.insert(ideaConnections).values({
    userId,
    ideaPrimaryIdA: idA,
    ideaPrimaryIdB: idB,
    connectionType: connection.connectionType,
    description: connection.description,
    strength: connection.strength ?? 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
```

#### Issue 2 Fix: Use Junction Table

```typescript
async createNetwork(userId: string, network: {
  title: string;
  description?: string;
  primarySource?: string;
  ideaPrimaryIds: number[];
}): Promise<IdeaNetwork> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Insert network
  const result = await db.insert(ideaNetworks).values({
    userId,
    title: network.title,
    description: network.description,
    primarySource: network.primarySource,
    createdAt: now,
    updatedAt: now,
  });

  const networkId = result[0].insertId;

  // Insert junction records
  for (const ideaPrimaryId of network.ideaPrimaryIds) {
    await db.insert(ideaNetworkPrimaries).values({
      networkId,
      ideaPrimaryId,
    });
  }

  return db.select().from(ideaNetworks)
    .where(eq(ideaNetworks.id, networkId))
    .then(rows => rows[0]);
}

async getNetworkWithDetails(networkId: number, userId: string): Promise<{
  network: IdeaNetwork;
  ideas: IdeaPrimary[];
  instances: Record<number, IdeaInstance[]>;
  connections: IdeaConnection[];
}> {
  const db = await getDb();

  // Fetch network
  const network = await db.select().from(ideaNetworks)
    .where(and(eq(ideaNetworks.id, networkId), eq(ideaNetworks.userId, userId)))
    .then(rows => rows[0]);

  if (!network) throw new TRPCError({ code: "NOT_FOUND" });

  // Fetch idea IDs from junction table
  const junctions = await db.select().from(ideaNetworkPrimaries)
    .where(eq(ideaNetworkPrimaries.networkId, networkId));

  const ideaPrimaryIds = junctions.map(j => j.ideaPrimaryId);

  // Fetch all ideas, instances, and connections
  const ideas = await db.select().from(ideaPrimaries)
    .where(inArray(ideaPrimaries.id, ideaPrimaryIds));

  const instances: Record<number, IdeaInstance[]> = {};
  for (const ideaId of ideaPrimaryIds) {
    instances[ideaId] = await this.getInstancesByPrimaryIdea(ideaId, userId);
  }

  const connections = await db.select().from(ideaConnections)
    .where(and(
      eq(ideaConnections.userId, userId),
      or(
        inArray(ideaConnections.ideaPrimaryIdA, ideaPrimaryIds),
        inArray(ideaConnections.ideaPrimaryIdB, ideaPrimaryIds),
      )
    ));

  return { network, ideas, instances, connections };
}
```

#### Issue 3 Fix: Extend updateInstance

```typescript
async updateInstance(id: number, userId: string, updates: Partial<{
  context: string;
  source: string;
  location: string;
  meaning: string;
  interpretation: string;
  dateEncountered: string;
}>): Promise<IdeaInstance> {
  const db = await getDb();

  // Verify ownership
  const existing = await db.select().from(ideaInstances)
    .where(and(eq(ideaInstances.id, id), eq(ideaInstances.userId, userId)))
    .then(rows => rows[0]);

  if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

  // Auto-extract locationOrder if location is being updated
  let locationOrder = existing.locationOrder;
  if (updates.location !== undefined) {
    locationOrder = extractLocationOrder(updates.location) ?? undefined;
  }

  return db.update(ideaInstances)
    .set({
      ...updates,
      locationOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(ideaInstances.id, id))
    .then(() => db.select().from(ideaInstances)
      .where(eq(ideaInstances.id, id))
      .then(rows => rows[0]));
}
```

#### Issue 4 Fix: Validate Word Ownership

```typescript
async createInstance(userId: string, instance: {
  ideaPrimaryId: number;
  wordId?: number;
  context: string;
  source?: string;
  location?: string;
  meaning?: string;
  interpretation?: string;
  dateEncountered?: string;
}): Promise<IdeaInstance> {
  const db = await getDb();

  // Guard: verify wordId belongs to current user
  if (instance.wordId !== undefined) {
    const word = await db.select().from(words)
      .where(and(
        eq(words.id, instance.wordId),
        eq(words.userId, userId)
      ))
      .then(rows => rows[0]);

    if (!word) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Word not found or does not belong to the current user",
      });
    }
  }

  const locationOrder = extractLocationOrder(instance.location) ?? undefined;
  const now = new Date().toISOString();

  return db.insert(ideaInstances).values({
    ideaPrimaryId: instance.ideaPrimaryId,
    userId,
    wordId: instance.wordId,
    context: instance.context,
    source: instance.source,
    location: instance.location,
    locationOrder,
    meaning: instance.meaning,
    interpretation: instance.interpretation,
    dateEncountered: instance.dateEncountered,
    createdAt: now,
    updatedAt: now,
  });
}
```

#### Issue 5 Fix: Extract Location Order

```typescript
// In shared/utils.ts (or server/utils.ts)

/**
 * Extracts a numeric sort key from a location string.
 * Returns null if no numeric value can be found.
 *
 * Handles formats:
 *   "p. 23"         → 23
 *   "Ch. 4, p. 89"  → 89      (page takes precedence over chapter)
 *   "page 102"      → 102
 *   "§ 3.2"         → 3       (integer part only)
 *   "1:23:45"       → 5025    (converted to seconds for video/podcast)
 *   "Ch. 4"         → 4       (chapter number as fallback)
 */
export function extractLocationOrder(location: string | null | undefined): number | null {
  if (!location) return null;

  // Priority 1: explicit page reference
  const pageMatch = location.match(/(?:p\.?|page)\s*(\d+)/i);
  if (pageMatch) return parseInt(pageMatch[1], 10);

  // Priority 2: timestamp (h:mm:ss or m:ss)
  const timeMatch = location.match(/(\d+):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return parseInt(timeMatch[1]) * 3600
         + parseInt(timeMatch[2]) * 60
         + parseInt(timeMatch[3]);
  }
  const shortTimeMatch = location.match(/(\d+):(\d{2})/);
  if (shortTimeMatch) {
    return parseInt(shortTimeMatch[1]) * 60 + parseInt(shortTimeMatch[2]);
  }

  // Priority 3: section / chapter / paragraph number
  const sectionMatch = location.match(/(?:ch(?:apter)?\.?|§|sec(?:tion)?\.?)\s*(\d+)/i);
  if (sectionMatch) return parseInt(sectionMatch[1], 10);

  // Priority 4: any leading number
  const numMatch = location.match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return null;
}
```

#### Issue 7 Fix: Query Both Connection Directions

```typescript
async getConnectionsForIdea(ideaPrimaryId: number, userId: string): Promise<IdeaConnection[]> {
  const db = await getDb();
  return db.select().from(ideaConnections)
    .where(
      and(
        eq(ideaConnections.userId, userId),
        or(
          eq(ideaConnections.ideaPrimaryIdA, ideaPrimaryId),
          eq(ideaConnections.ideaPrimaryIdB, ideaPrimaryId),
        )
      )
    );
}
```

### tRPC Procedures (`server/routers/ideas.ts`)

```typescript
import { protectedProcedure, router } from "../_core/trpc";
import { storage } from "../storage";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { extractLocationOrder } from "../utils";

// Define allowed connection types (Issue 9 fix)
const CONNECTION_TYPES = [
  "contrast",
  "supports",
  "contradicts",
  "precedes",
  "enables",
] as const;

export type ConnectionType = typeof CONNECTION_TYPES[number];

// Date format validation (Issue 6 fix)
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const ideaRouter = router({
  // Primary Ideas
  createPrimary: protectedProcedure
    .input(z.object({
      term: z.string().min(1).max(255),
      description: z.string().optional(),
      originLanguage: z.string().optional().default("english"),
      primarySource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return storage.createPrimaryIdea(ctx.user.id, input);
    }),

  getPrimary: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return storage.getPrimaryIdea(input, ctx.user.id);
    }),

  listPrimaries: protectedProcedure
    .query(async ({ ctx }) => {
      return storage.getAllPrimaryIdeas(ctx.user.id);
    }),

  updatePrimary: protectedProcedure
    .input(z.object({
      id: z.number(),
      term: z.string().optional(),
      description: z.string().optional(),
      primarySource: z.string().optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return storage.updatePrimaryIdea(id, ctx.user.id, updates);
    }),

  deletePrimary: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return storage.deletePrimaryIdea(input, ctx.user.id);
    }),

  // Instances
  createInstance: protectedProcedure
    .input(z.object({
      ideaPrimaryId: z.number(),
      wordId: z.number().optional(),
      context: z.string().min(1),
      source: z.string().optional(),
      location: z.string().optional(),
      meaning: z.string().optional(),
      interpretation: z.string().optional(),
      dateEncountered: z.string()
        .regex(ISO_DATE_REGEX, "dateEncountered must be in YYYY-MM-DD format")
        .optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return storage.createInstance(ctx.user.id, input);
    }),

  getInstancesByIdea: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return storage.getInstancesByPrimaryIdea(input, ctx.user.id);
    }),

  updateInstance: protectedProcedure
    .input(z.object({
      id: z.number(),
      context: z.string().optional(),
      source: z.string().optional(),
      location: z.string().optional(),
      meaning: z.string().optional(),
      interpretation: z.string().optional(),
      dateEncountered: z.string()
        .regex(ISO_DATE_REGEX, "dateEncountered must be in YYYY-MM-DD format")
        .optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return storage.updateInstance(id, ctx.user.id, updates);
    }),

  deleteInstance: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return storage.deleteInstance(input, ctx.user.id);
    }),

  // Connections
  createConnection: protectedProcedure
    .input(z.object({
      ideaPrimaryIdA: z.number(),
      ideaPrimaryIdB: z.number(),
      connectionType: z.enum(CONNECTION_TYPES).optional(),
      description: z.string().optional(),
      strength: z.number().min(1).max(10).optional().default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      return storage.createConnection(ctx.user.id, input);
    }),

  getConnectionsForIdea: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return storage.getConnectionsForIdea(input, ctx.user.id);
    }),

  updateConnection: protectedProcedure
    .input(z.object({
      id: z.number(),
      connectionType: z.enum(CONNECTION_TYPES).optional(),
      description: z.string().optional(),
      strength: z.number().min(1).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return storage.updateConnection(id, ctx.user.id, updates);
    }),

  deleteConnection: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return storage.deleteConnection(input, ctx.user.id);
    }),

  // Networks
  createNetwork: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      primarySource: z.string().optional(),
      ideaPrimaryIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      return storage.createNetwork(ctx.user.id, input);
    }),

  getNetwork: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return storage.getNetwork(input, ctx.user.id);
    }),

  listNetworks: protectedProcedure
    .query(async ({ ctx }) => {
      return storage.getAllNetworks(ctx.user.id);
    }),

  getNetworkWithDetails: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return storage.getNetworkWithDetails(input, ctx.user.id);
    }),

  updateNetwork: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      primarySource: z.string().optional(),
      ideaPrimaryIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return storage.updateNetwork(id, ctx.user.id, updates);
    }),

  deleteNetwork: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return storage.deleteNetwork(input, ctx.user.id);
    }),
});
```

---

## Part 6: Frontend Architecture

### New Components

#### 1. `IdeaNetworkView.tsx`
Main page for browsing and managing idea networks.

**Features:**
- List all networks for current user
- Create new network button
- Search/filter networks by title or source
- Delete network with confirmation

#### 2. `IdeaNetworkDetail.tsx`
Detailed view of a single network showing all Primary Ideas and connections.

**Features:**
- Display network metadata (title, source, description)
- Show all Primary Ideas as a list or grid
- Show connections between ideas
- Add/edit/delete ideas and connections
- Edit network metadata

#### 3. `PrimaryIdeaDetail.tsx`
Detailed view of a single Primary Idea showing all its instances across sources.

**Features:**
- Display idea term, description, origin language
- Show all instances in a scrollable list
- Each instance card shows: context, source, location, meaning, interpretation
- Add new instance button
- Edit/delete instances
- Show connections to other ideas

#### 4. `InstanceCard.tsx`
Reusable component for displaying a single instance.

**Props:**
```typescript
interface InstanceCardProps {
  instance: IdeaInstance;
  ideaTerm: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onLinkWord?: () => void;
}
```

#### 5. `CreateIdeaModal.tsx`
Modal for creating a new Primary Idea or instance.

**Modes:**
- `"primary"`: Create a new Primary Idea
- `"instance"`: Add an instance to an existing idea

#### 6. `IdeaConnectionEditor.tsx`
Modal for creating/editing connections between ideas.

**Features:**
- Select two ideas to connect
- Choose connection type from enum (Issue 9)
- Set strength (1–10)
- Add description

### UI Integration Points

#### In Home.tsx Navigation

Add "Ideas" tab to bottom navigation. **Note:** This creates a 6th tab issue (Issue 10). Recommendation: **Consolidate Tags + Sources into an "Explore" tab** to keep navigation at 5 items.

```typescript
type View =
  | "collection"
  | "add"
  | "calendar"
  | "explore"   // replaces "tags" and "sources"
  | "ideas";
```

Alternatively, **nest Ideas within the Sources view** since every idea network is tied to a source.

#### In WordDetail.tsx

Add "Link to Idea" button to allow linking a word to an idea instance.

#### In EditWord.tsx

Show linked ideas (if any) and allow unlinking.

---

## Part 7: Implementation Phases

### Phase 1: Core Data Model & API (Foundation)
**Duration:** 1–2 weeks

1. Create database tables with all fixes applied
2. Implement storage layer with all CRUD helpers
3. Implement tRPC procedures with validation
4. Write vitest tests for storage and procedures
5. Test data isolation and security

**Deliverable:** Fully functional backend API.

### Phase 2: Primary UI (Basic Browsing & Creation)
**Duration:** 1–2 weeks

1. Build IdeaNetworkView (list networks)
2. Build CreateIdeaModal (create ideas and instances)
3. Build PrimaryIdeaDetail (browse instances)
4. Add "Ideas" tab to Home.tsx navigation (with nav consolidation decision)
5. Write component tests

**Deliverable:** Users can create ideas, add instances, and browse them.

### Phase 3: Connections & Visualization (Advanced)
**Duration:** 2–3 weeks

1. Build IdeaConnectionEditor (create/edit connections)
2. Implement idea graph visualization (D3 or similar)
3. Build IdeaNetworkDetail (full network view with graph)
4. Persist node positions (Issue 13)
5. Add connection filtering and strength visualization

**Deliverable:** Users can visualize how ideas relate to each other.

### Phase 4: Integration & Polish (Refinement)
**Duration:** 1–2 weeks

1. Add "Link to Idea" in WordDetail
2. Show linked ideas in EditWord
3. Add search across ideas and instances
4. Add export/import for idea networks
5. Performance optimization (caching, pagination if needed)

**Deliverable:** Ideas Mode fully integrated with existing features.

---

## Part 8: Testing Strategy

### Unit Tests (Vitest)

**`server/storage.ideas.test.ts`:**

```typescript
describe("Ideas Storage", () => {
  describe("Primary Ideas", () => {
    test("createPrimaryIdea creates idea with auto-generated color", async () => {
      const idea = await storage.createPrimaryIdea("user123", {
        term: "thin-slicing",
        description: "Snap judgments",
      });
      expect(idea.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(idea.term).toBe("thin-slicing");
    });

    test("getPrimaryIdea respects user isolation", async () => {
      const idea1 = await storage.createPrimaryIdea("user1", { term: "idea1" });
      const retrieved = await storage.getPrimaryIdea(idea1.id, "user2");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("Connections (Issue 1 Fix)", () => {
    test("createConnection normalizes direction (smaller ID in A)", async () => {
      const idea1 = await storage.createPrimaryIdea("user1", { term: "A" });
      const idea2 = await storage.createPrimaryIdea("user1", { term: "B" });
      
      const conn = await storage.createConnection("user1", {
        ideaPrimaryIdA: idea2.id,
        ideaPrimaryIdB: idea1.id,
      });
      
      expect(conn.ideaPrimaryIdA).toBe(idea1.id);
      expect(conn.ideaPrimaryIdB).toBe(idea2.id);
    });

    test("createConnection prevents duplicate edges (Issue 1)", async () => {
      const idea1 = await storage.createPrimaryIdea("user1", { term: "A" });
      const idea2 = await storage.createPrimaryIdea("user1", { term: "B" });
      
      await storage.createConnection("user1", {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea2.id,
      });
      
      // Attempt to insert in reverse order should fail
      await expect(
        storage.createConnection("user1", {
          ideaPrimaryIdA: idea2.id,
          ideaPrimaryIdB: idea1.id,
        })
      ).rejects.toThrow();
    });

    test("getConnectionsForIdea queries both directions (Issue 7)", async () => {
      const idea1 = await storage.createPrimaryIdea("user1", { term: "A" });
      const idea2 = await storage.createPrimaryIdea("user1", { term: "B" });
      
      await storage.createConnection("user1", {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea2.id,
      });
      
      // Query by either idea should return the connection
      const connsForIdea1 = await storage.getConnectionsForIdea(idea1.id, "user1");
      const connsForIdea2 = await storage.getConnectionsForIdea(idea2.id, "user1");
      
      expect(connsForIdea1).toHaveLength(1);
      expect(connsForIdea2).toHaveLength(1);
    });
  });

  describe("Instances (Issue 3 & 4 Fixes)", () => {
    test("createInstance allows editing source and location (Issue 3)", async () => {
      const idea = await storage.createPrimaryIdea("user1", { term: "concept" });
      const instance = await storage.createInstance("user1", {
        ideaPrimaryId: idea.id,
        context: "Test context",
        source: "Test Book",
        location: "p. 42",
      });
      
      expect(instance.source).toBe("Test Book");
      expect(instance.location).toBe("p. 42");
    });

    test("updateInstance can edit all fields including source/location (Issue 3)", async () => {
      const idea = await storage.createPrimaryIdea("user1", { term: "concept" });
      const instance = await storage.createInstance("user1", {
        ideaPrimaryId: idea.id,
        context: "Original context",
        source: "Book A",
      });
      
      const updated = await storage.updateInstance(instance.id, "user1", {
        source: "Book B",
        location: "p. 99",
      });
      
      expect(updated.source).toBe("Book B");
      expect(updated.location).toBe("p. 99");
    });

    test("createInstance validates word ownership (Issue 4)", async () => {
      const idea = await storage.createPrimaryIdea("user1", { term: "concept" });
      const word = await storage.createWord({
        word: "test",
        originLanguage: "english",
        userId: "user1",
        dateAdded: "2024-01-01",
        createdAt: new Date().toISOString(),
      });
      
      // User2 tries to link user1's word
      await expect(
        storage.createInstance("user2", {
          ideaPrimaryId: idea.id,
          wordId: word.id,
          context: "Test",
        })
      ).rejects.toThrow("Word not found or does not belong");
    });

    test("locationOrder is auto-extracted from location (Issue 5)", async () => {
      const idea = await storage.createPrimaryIdea("user1", { term: "concept" });
      const instance = await storage.createInstance("user1", {
        ideaPrimaryId: idea.id,
        context: "Test",
        location: "p. 42",
      });
      
      expect(instance.locationOrder).toBe(42);
    });
  });

  describe("Networks (Issue 2 Fix)", () => {
    test("deleteNetwork cascades via junction table (Issue 2)", async () => {
      const idea1 = await storage.createPrimaryIdea("user1", { term: "A" });
      const idea2 = await storage.createPrimaryIdea("user1", { term: "B" });
      
      const network = await storage.createNetwork("user1", {
        title: "Test Network",
        ideaPrimaryIds: [idea1.id, idea2.id],
      });
      
      // Delete idea1
      await storage.deletePrimaryIdea(idea1.id, "user1");
      
      // Network should still exist but only contain idea2
      const retrieved = await storage.getNetworkWithDetails(network.id, "user1");
      expect(retrieved.ideas).toHaveLength(1);
      expect(retrieved.ideas[0].id).toBe(idea2.id);
    });
  });
});
```

---

## Part 9: Data Isolation & Security

All idea operations follow the same user-scoping pattern as words:

- **User Isolation:** All queries filter by `userId`
- **Ownership Checks:** Update and delete operations verify ownership
- **Protected Procedures:** All idea procedures require authentication
- **Cascading Deletes:** Deleting a Primary Idea cascades to instances and connections
- **Word Ownership Validation:** Creating an instance with a `wordId` validates that the word belongs to the current user (Issue 4)

---

## Part 10: Summary of Critical Fixes

| Issue | Problem | Fix | Impact |
|-------|---------|-----|--------|
| 1 | Duplicate edges in graph | Normalize connection direction (A < B) | Prevents duplicate connections |
| 2 | Stale foreign keys in networks | Use junction table instead of JSON | Ensures referential integrity |
| 3 | Can't edit source/location | Extend updateInstance API | Allows users to correct typos |
| 4 | Cross-user word references | Validate wordId ownership | Prevents data isolation breach |
| 5 | No location order extraction | Define extractLocationOrder utility | Enables proper sorting by reading order |
| 6 | Unvalidated date format | Add Zod regex validation | Prevents timeline sorting bugs |
| 7 | Incomplete connection queries | Query both ideaPrimaryIdA and B | Ensures graph completeness |
| 9 | Unvalidated connection types | Constrain to enum via Zod | Enables filtering and visualization |
| 11 | Ambiguous "source" field | Rename to "primarySource" | Clarifies multi-source support |
| 12 | Missing updatedAt fields | Add to instances and connections | Enables audit trails and sync |

---

## Conclusion

Ideas Mode transforms Name of the Words into a tool for analytical reading and intellectual research. This revised specification incorporates all critical bug fixes and security improvements identified during design review. The phased rollout allows for iterative development while maintaining data integrity and user isolation.

Implementation should follow the critical fixes first (Issues 1–6), then proceed with Phase 1 of the frontend development.
