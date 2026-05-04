# Ideas Mode: Technical Specification

## Overview

**Ideas Mode** is a new feature inspired by Mortimer Adler's analytical reading methodology. It enables users to identify key terms, arguments, and concepts (called "Primary Ideas") and trace how they appear, interact, and evolve across different sources and contexts. This feature transforms Name of the Words from a personal lexicon into a tool for deep intellectual analysis.

### Core Concept

In analytical reading, understanding a text requires identifying key terms and understanding how they work individually and collectively within an argument. Ideas Mode operationalizes this:

- A **Primary Idea** is a key term, concept, or argument (e.g., "thin-slicing" from Gladwell's *Blink*)
- **Instances** are specific occurrences of that idea in different contexts, sources, or with different meanings
- **Connections** link related Primary Ideas to show how concepts interact (e.g., "thin-slicing" ↔ "thick-slicing")
- **Idea Networks** are the visual/conceptual graphs showing all Primary Ideas and their connections for a given source or research project

### Example: Blink by Malcolm Gladwell

**Primary Idea 1:** "Thin-slicing"
- Instance 1: "The ability to make accurate judgments based on minimal information" (Ch. 1, p. 23)
- Instance 2: "Snap judgments made by art experts in milliseconds" (Ch. 2, p. 45)
- Instance 3: "Speed dating participants' ability to assess compatibility instantly" (Ch. 4, p. 89)

**Primary Idea 2:** "Thick-slicing"
- Instance 1: "Deliberate, conscious analysis requiring extended time" (Ch. 1, p. 25)
- Instance 2: "Traditional scientific method of hypothesis testing" (Ch. 3, p. 67)

**Connection:** "Thin-slicing" vs. "Thick-slicing" — contrasting epistemological approaches

---

## Database Schema

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
  sourceContext VARCHAR(512),
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (userId),
  INDEX (createdAt)
);
```

**Columns:**
- `id`: Unique identifier for the primary idea
- `userId`: Owner (Manus OAuth openId) for data isolation
- `term`: The key term or concept (e.g., "thin-slicing")
- `description`: Optional user-defined description of the idea
- `originLanguage`: Language of the term
- `createdAt`, `updatedAt`: Timestamps
- `color`: Auto-generated hex color for visual identity in network graphs
- `sourceContext`: Optional default source where this idea originates (e.g., "Blink")

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
  FOREIGN KEY (ideaPrimaryId) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  FOREIGN KEY (wordId) REFERENCES words(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (ideaPrimaryId),
  INDEX (userId),
  INDEX (wordId)
);
```

**Columns:**
- `id`: Unique identifier for the instance
- `ideaPrimaryId`: Foreign key to `idea_primaries`
- `userId`: Owner for data isolation
- `wordId`: Optional link to a word entry (if this instance is also a saved word)
- `context`: The sentence or passage where this instance appears
- `source`: Book title, article, etc.
- `location`: Page number, chapter, timestamp, etc.
- `locationOrder`: Auto-extracted integer for sorting
- `meaning`: How the term is used in this specific context
- `interpretation`: User's notes on what this instance reveals about the idea
- `dateEncountered`: ISO date string when user encountered this instance

#### 3. `idea_connections` Table
Stores relationships between Primary Ideas (e.g., "thin-slicing" vs. "thick-slicing").

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
  FOREIGN KEY (ideaPrimaryIdA) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  FOREIGN KEY (ideaPrimaryIdB) REFERENCES idea_primaries(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(openId) ON DELETE CASCADE,
  INDEX (userId),
  INDEX (ideaPrimaryIdA),
  INDEX (ideaPrimaryIdB),
  UNIQUE KEY (userId, ideaPrimaryIdA, ideaPrimaryIdB)
);
```

**Columns:**
- `id`: Unique identifier
- `userId`: Owner for data isolation
- `ideaPrimaryIdA`, `ideaPrimaryIdB`: The two connected ideas
- `connectionType`: Enum or string describing the relationship (e.g., "contrast", "supports", "contradicts", "precedes", "enables")
- `description`: User notes on how the ideas relate
- `strength`: 1–10 scale indicating how strongly connected the ideas are
- `createdAt`: Timestamp

#### 4. `idea_networks` Table
Stores named collections of related Primary Ideas (e.g., a research project or a book analysis).

```sql
CREATE TABLE idea_networks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source VARCHAR(512),
  ideaPrimaryIds TEXT NOT NULL,
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
- `source`: The primary source being analyzed
- `ideaPrimaryIds`: JSON array of idea_primary IDs included in this network
- `createdAt`, `updatedAt`: Timestamps

---

## Data Model & Relationships

```
User (users.openId)
  ├── idea_primaries (1:N)
  │   ├── idea_instances (1:N)
  │   │   └── words (0:1) [optional link]
  │   └── idea_connections (N:M via ideaPrimaryIdA/B)
  └── idea_networks (1:N)
      └── idea_primaries (N:M via ideaPrimaryIds JSON)
```

### Key Design Decisions

**Why separate `idea_primaries` and `idea_instances`?**
A Primary Idea may appear in many contexts with subtly different meanings or implications. Separating them allows users to track how an idea evolves or manifests differently across sources. For example, "thin-slicing" in *Blink* appears in art expertise, speed dating, and military contexts—each instance reveals something different about the core concept.

**Why optional `wordId` link in `idea_instances`?**
Some instances may already be saved as words in the user's collection. The optional link allows ideas to reference existing words without forcing duplication. A user can capture a word, then later realize it's an instance of a broader Primary Idea and link it retroactively.

**Why JSON for `ideaPrimaryIds` in `idea_networks`?**
Networks are curated collections of ideas. Using JSON (similar to how tags are stored) simplifies queries and avoids a separate junction table. Networks are typically small (5–20 ideas), so the performance trade-off is acceptable.

**Why `connectionType` enum?**
Analytical reading often involves understanding how ideas relate: contrasts, supports, enables, contradicts, precedes. Storing the type enables future UI features like filtering connections by type or visualizing different relationship categories.

---

## API Design

### Storage Layer (`server/storage.ts` Extensions)

```typescript
export interface IIdeaStorage {
  // Primary Ideas
  createPrimaryIdea(userId: string, idea: {
    term: string;
    description?: string;
    originLanguage?: string;
    sourceContext?: string;
  }): Promise<IdeaPrimary>;

  getPrimaryIdea(id: number, userId: string): Promise<IdeaPrimary | undefined>;

  getAllPrimaryIdeas(userId: string): Promise<IdeaPrimary[]>;

  updatePrimaryIdea(id: number, userId: string, updates: Partial<{
    term: string;
    description: string;
    sourceContext: string;
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
    meaning: string;
    interpretation: string;
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
    source?: string;
    ideaPrimaryIds: number[];
  }): Promise<IdeaNetwork>;

  getNetwork(id: number, userId: string): Promise<IdeaNetwork | undefined>;

  getAllNetworks(userId: string): Promise<IdeaNetwork[]>;

  updateNetwork(id: number, userId: string, updates: Partial<{
    title: string;
    description: string;
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

### tRPC Procedures (`server/routers.ts` Extensions)

```typescript
export const appRouter = router({
  // ... existing routers ...

  ideas: router({
    // Primary Ideas
    createPrimary: protectedProcedure
      .input(z.object({
        term: z.string().min(1).max(255),
        description: z.string().optional(),
        originLanguage: z.string().optional().default("english"),
        sourceContext: z.string().optional(),
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
        sourceContext: z.string().optional(),
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
        dateEncountered: z.string().optional(),
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
        meaning: z.string().optional(),
        interpretation: z.string().optional(),
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
        connectionType: z.string().optional(),
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
        connectionType: z.string().optional(),
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
        source: z.string().optional(),
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
  }),
});
```

---

## Frontend Architecture

### New Components

#### 1. `IdeaNetworkView.tsx`
Main page for browsing and managing idea networks. Shows a list of networks with source, idea count, and creation date. Clicking a network opens the detailed view.

**Props:**
```typescript
interface IdeaNetworkViewProps {
  onSelectNetwork?: (networkId: number) => void;
}
```

**Features:**
- List all networks for current user
- Create new network button
- Search/filter networks by source or title
- Delete network with confirmation

#### 2. `IdeaNetworkDetail.tsx`
Detailed view of a single network showing all Primary Ideas, their instances, and connections in an interactive graph.

**Props:**
```typescript
interface IdeaNetworkDetailProps {
  networkId: number;
  onBack?: () => void;
}
```

**Features:**
- Display network metadata (title, source, description)
- Render idea graph (using D3 or similar for visualization)
- Show all Primary Ideas as nodes
- Show connections as edges with labels (contrast, supports, etc.)
- Click idea node to drill into instances
- Add/edit/delete ideas and connections
- Edit network metadata

#### 3. `PrimaryIdeaDetail.tsx`
Detailed view of a single Primary Idea showing all its instances across sources.

**Props:**
```typescript
interface PrimaryIdeaDetailProps {
  ideaPrimaryId: number;
  onBack?: () => void;
}
```

**Features:**
- Display idea term, description, origin language
- Show all instances in a scrollable list or card deck (similar to SourceDeck pattern)
- Each instance card shows: context, source, location, meaning, interpretation
- Add new instance button
- Edit/delete instances
- Show connections to other ideas
- Link/unlink existing words

#### 4. `InstanceCard.tsx`
Reusable component for displaying a single instance of an idea.

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

**Features:**
- Display context with idea term highlighted
- Show source, location, meaning, interpretation
- Optional word link indicator
- Edit/delete/link actions

#### 5. `CreateIdeaModal.tsx`
Modal for creating a new Primary Idea or instance.

**Props:**
```typescript
interface CreateIdeaModalProps {
  mode: "primary" | "instance";
  ideaPrimaryId?: number;
  wordId?: number;
  onSuccess?: (idea: IdeaPrimary | IdeaInstance) => void;
  onClose?: () => void;
}
```

**Features:**
- Form for creating Primary Idea (term, description, origin language)
- Form for creating Instance (context, source, location, meaning, interpretation)
- Optional word link selector
- Date picker for dateEncountered

#### 6. `IdeaConnectionEditor.tsx`
Modal for creating/editing connections between ideas.

**Props:**
```typescript
interface IdeaConnectionEditorProps {
  ideaPrimaryIdA: number;
  ideaPrimaryIdB?: number;
  onSuccess?: (connection: IdeaConnection) => void;
  onClose?: () => void;
}
```

**Features:**
- Select two ideas to connect
- Choose connection type (contrast, supports, contradicts, precedes, enables)
- Set strength (1–10)
- Add description

### UI Integration Points

#### In Home.tsx
Add "Ideas" tab to bottom navigation alongside Collection, Add Word, Calendar, Tags, Sources.

```typescript
const [currentView, setCurrentView] = useState<View>(
  "collection" | "add" | "calendar" | "tags" | "sources" | "ideas"
);

// In navigation:
<NavButton
  icon={<NetworkIcon />}
  label="Ideas"
  active={currentView === "ideas"}
  onClick={() => setCurrentView("ideas")}
/>

// In view rendering:
{currentView === "ideas" && <IdeaNetworkView />}
```

#### In WordDetail.tsx
Add "Link to Idea" button to allow linking a word to an idea instance.

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowLinkIdeaModal(true)}
>
  Link to Idea
</Button>
```

#### In EditWord.tsx
Show linked ideas (if any) and allow unlinking.

```typescript
{linkedIdeas.length > 0 && (
  <div className="mt-4">
    <label className="text-xs font-semibold text-muted-foreground">
      LINKED IDEAS
    </label>
    <div className="flex flex-wrap gap-2 mt-2">
      {linkedIdeas.map(idea => (
        <Badge key={idea.id} variant="secondary">
          {idea.term}
          <button onClick={() => unlinkIdea(idea.id)}>×</button>
        </Badge>
      ))}
    </div>
  </div>
)}
```

---

## Implementation Phases

### Phase 1: Core Data Model & API (Foundation)
1. Create database tables (idea_primaries, idea_instances, idea_connections, idea_networks)
2. Implement storage layer (CRUD helpers for all four tables)
3. Implement tRPC procedures (all 15+ procedures listed above)
4. Write vitest tests for storage and procedures

**Deliverable:** Fully functional backend API for managing ideas, instances, and connections.

### Phase 2: Primary UI (Basic Browsing & Creation)
1. Build IdeaNetworkView (list networks)
2. Build CreateIdeaModal (create primary ideas and instances)
3. Build PrimaryIdeaDetail (browse instances of an idea)
4. Add "Ideas" tab to Home.tsx navigation
5. Write component tests

**Deliverable:** Users can create ideas, add instances, and browse them.

### Phase 3: Connections & Visualization (Advanced)
1. Build IdeaConnectionEditor (create/edit connections)
2. Implement idea graph visualization (D3 or similar)
3. Build IdeaNetworkDetail (full network view with graph)
4. Add connection filtering and strength visualization

**Deliverable:** Users can visualize how ideas relate to each other.

### Phase 4: Integration & Polish (Refinement)
1. Add "Link to Idea" in WordDetail
2. Show linked ideas in EditWord
3. Add search across ideas and instances
4. Add export/import for idea networks
5. Performance optimization (caching, pagination)

**Deliverable:** Ideas Mode fully integrated with existing word collection features.

---

## Data Isolation & Security

All idea operations follow the same user-scoping pattern as words:

- **User Isolation:** All queries filter by `userId` to prevent cross-user data access
- **Ownership Checks:** Update and delete operations verify ownership before proceeding
- **Protected Procedures:** All idea procedures require authentication via `protectedProcedure`
- **Cascading Deletes:** Deleting a Primary Idea cascades to instances and connections

Example ownership check:
```typescript
async updatePrimaryIdea(id: number, userId: string, updates: Partial<...>) {
  const db = await getDb();
  const existing = await db.select().from(ideaPrimaries)
    .where(and(eq(ideaPrimaries.id, id), eq(ideaPrimaries.userId, userId)))
    .limit(1);
  
  if (!existing[0]) throw new Error("Idea not found or unauthorized");
  
  return db.update(ideaPrimaries)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(ideaPrimaries.id, id));
}
```

---

## Performance Considerations

### Indexing Strategy
- `idea_primaries(userId, createdAt)` for listing
- `idea_instances(ideaPrimaryId, userId)` for drilling into instances
- `idea_connections(userId, ideaPrimaryIdA, ideaPrimaryIdB)` for graph queries
- `idea_networks(userId, createdAt)` for listing networks

### Query Optimization
- Batch load instances for all ideas in a network (avoid N+1)
- Cache idea networks in React Query with appropriate invalidation
- Paginate instance lists if they grow large (100+ per idea)

### Lazy Loading
- Load idea networks on demand (don't fetch all on page load)
- Load instances only when drilling into a specific idea
- Load graph visualization only when viewing IdeaNetworkDetail

---

## Existing Codebase Blocks to Extend

### 1. `shared/schema.ts` — Add Type Definitions

```typescript
// Add these exports to shared/schema.ts

export type IdeaPrimary = {
  id: number;
  userId: string;
  term: string;
  description?: string;
  originLanguage: string;
  createdAt: string;
  updatedAt: string;
  color: string;
  sourceContext?: string;
};

export type IdeaInstance = {
  id: number;
  ideaPrimaryId: number;
  userId: string;
  wordId?: number;
  context: string;
  source?: string;
  location?: string;
  locationOrder?: number;
  meaning?: string;
  interpretation?: string;
  dateEncountered?: string;
  createdAt: string;
};

export type IdeaConnection = {
  id: number;
  userId: string;
  ideaPrimaryIdA: number;
  ideaPrimaryIdB: number;
  connectionType?: string;
  description?: string;
  strength: number;
  createdAt: string;
};

export type IdeaNetwork = {
  id: number;
  userId: string;
  title: string;
  description?: string;
  source?: string;
  ideaPrimaryIds: number[];
  createdAt: string;
  updatedAt: string;
};
```

### 2. `drizzle/schema.ts` — Add Table Definitions

```typescript
// Add to drizzle/schema.ts

import { mysqlTable, int, varchar, text, unique, index } from "drizzle-orm/mysql-core";

export const ideaPrimaries = mysqlTable("idea_primaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  term: varchar("term", { length: 255 }).notNull(),
  description: text("description"),
  originLanguage: varchar("origin_language", { length: 64 }).default("english"),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
  updatedAt: varchar("updated_at", { length: 64 }).notNull(),
  color: varchar("color", { length: 16 }),
  sourceContext: varchar("source_context", { length: 512 }),
}, (table) => ({
  userIdIdx: index("idx_idea_primaries_user_id").on(table.userId),
  createdAtIdx: index("idx_idea_primaries_created_at").on(table.createdAt),
}));

export const ideaInstances = mysqlTable("idea_instances", {
  id: int("id").autoincrement().primaryKey(),
  ideaPrimaryId: int("idea_primary_id").notNull(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  wordId: int("word_id"),
  context: text("context").notNull(),
  source: varchar("source", { length: 512 }),
  location: varchar("location", { length: 255 }),
  locationOrder: int("location_order"),
  meaning: text("meaning"),
  interpretation: text("interpretation"),
  dateEncountered: varchar("date_encountered", { length: 32 }),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
}, (table) => ({
  ideaPrimaryIdIdx: index("idx_idea_instances_idea_primary_id").on(table.ideaPrimaryId),
  userIdIdx: index("idx_idea_instances_user_id").on(table.userId),
  wordIdIdx: index("idx_idea_instances_word_id").on(table.wordId),
}));

export const ideaConnections = mysqlTable("idea_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  ideaPrimaryIdA: int("idea_primary_id_a").notNull(),
  ideaPrimaryIdB: int("idea_primary_id_b").notNull(),
  connectionType: varchar("connection_type", { length: 64 }),
  description: text("description"),
  strength: int("strength").default(5),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
}, (table) => ({
  userIdIdx: index("idx_idea_connections_user_id").on(table.userId),
  ideaPrimaryIdAIdx: index("idx_idea_connections_idea_primary_id_a").on(table.ideaPrimaryIdA),
  ideaPrimaryIdBIdx: index("idx_idea_connections_idea_primary_id_b").on(table.ideaPrimaryIdB),
  uniqueConnection: unique("unique_connection").on(table.userId, table.ideaPrimaryIdA, table.ideaPrimaryIdB),
}));

export const ideaNetworks = mysqlTable("idea_networks", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  source: varchar("source", { length: 512 }),
  ideaPrimaryIds: text("idea_primary_ids").notNull(),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
  updatedAt: varchar("updated_at", { length: 64 }).notNull(),
}, (table) => ({
  userIdIdx: index("idx_idea_networks_user_id").on(table.userId),
  createdAtIdx: index("idx_idea_networks_created_at").on(table.createdAt),
}));

export type IdeaPrimary = typeof ideaPrimaries.$inferSelect;
export type InsertIdeaPrimary = typeof ideaPrimaries.$inferInsert;
export type IdeaInstance = typeof ideaInstances.$inferSelect;
export type InsertIdeaInstance = typeof ideaInstances.$inferInsert;
export type IdeaConnection = typeof ideaConnections.$inferSelect;
export type InsertIdeaConnection = typeof ideaConnections.$inferInsert;
export type IdeaNetwork = typeof ideaNetworks.$inferSelect;
export type InsertIdeaNetwork = typeof ideaNetworks.$inferInsert;
```

### 3. `server/storage.ts` — Add Storage Implementation

The storage class should extend `IStorage` with the new idea methods. Example pattern (full implementation follows the interface defined above):

```typescript
export class DatabaseStorage implements IStorage {
  // ... existing methods ...

  async createPrimaryIdea(userId: string, idea: {
    term: string;
    description?: string;
    originLanguage?: string;
    sourceContext?: string;
  }): Promise<IdeaPrimary> {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    const now = new Date().toISOString();
    const color = generateUniqueColor();
    
    const result = await db.insert(ideaPrimaries).values({
      userId,
      term: idea.term,
      description: idea.description,
      originLanguage: idea.originLanguage || "english",
      sourceContext: idea.sourceContext,
      color,
      createdAt: now,
      updatedAt: now,
    });
    
    const ideaId = result[0].insertId;
    return db.select().from(ideaPrimaries)
      .where(eq(ideaPrimaries.id, ideaId))
      .then(rows => rows[0]);
  }

  // ... implement remaining methods following same pattern ...
}
```

### 4. `server/routers.ts` — Add Ideas Router

```typescript
import { ideaRouter } from "./routers/ideas";

export const appRouter = router({
  // ... existing routers ...
  ideas: ideaRouter,
});
```

Create new file `server/routers/ideas.ts`:

```typescript
import { protectedProcedure, router } from "../_core/trpc";
import { storage } from "../storage";
import { z } from "zod";

export const ideaRouter = router({
  // ... all procedures from API Design section above ...
});
```

### 5. `client/src/App.tsx` — Add Ideas Route

```typescript
import IdeaNetworkView from "./pages/IdeaNetworkView";

// In Router component:
<Route path="/ideas" component={IdeaNetworkView} />
```

### 6. `client/src/pages/Home.tsx` — Add Ideas Navigation

```typescript
const [currentView, setCurrentView] = useState<View>(
  "collection" | "add" | "calendar" | "tags" | "sources" | "ideas"
);

// In navigation bar:
<NavButton
  icon={<Network2 />}
  label="Ideas"
  active={currentView === "ideas"}
  onClick={() => setCurrentView("ideas")}
/>

// In view rendering:
{currentView === "ideas" && (
  <motion.div key="ideas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <IdeaNetworkView />
  </motion.div>
)}
```

---

## Testing Strategy

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

  describe("Instances", () => {
    test("createInstance links to primary idea", async () => {
      const idea = await storage.createPrimaryIdea("user1", { term: "concept" });
      const instance = await storage.createInstance("user1", {
        ideaPrimaryId: idea.id,
        context: "This is a test context",
        source: "Test Book",
      });
      expect(instance.ideaPrimaryId).toBe(idea.id);
    });
  });

  describe("Connections", () => {
    test("createConnection prevents duplicate connections", async () => {
      const idea1 = await storage.createPrimaryIdea("user1", { term: "A" });
      const idea2 = await storage.createPrimaryIdea("user1", { term: "B" });
      await storage.createConnection("user1", {
        ideaPrimaryIdA: idea1.id,
        ideaPrimaryIdB: idea2.id,
      });
      // Second attempt should fail or return existing
      expect(async () => {
        await storage.createConnection("user1", {
          ideaPrimaryIdA: idea1.id,
          ideaPrimaryIdB: idea2.id,
        });
      }).toThrow();
    });
  });
});
```

### Integration Tests

**`server/ideas.integration.test.ts`:**
Test full workflows like:
- Create idea → add multiple instances → create connections → view network
- Link existing word to idea instance
- Export/import idea network

---

## Migration Path

### Step 1: Database Migration
```bash
pnpm db:push
```

### Step 2: Deploy Storage Layer
- Add storage methods to `server/storage.ts`
- Add tests
- Deploy

### Step 3: Deploy API
- Add tRPC procedures to `server/routers.ts`
- Add tests
- Deploy

### Step 4: Deploy UI (Phase 1)
- Add IdeaNetworkView, CreateIdeaModal, PrimaryIdeaDetail
- Add "Ideas" tab to navigation
- Deploy

### Step 5: Deploy UI (Phase 2+)
- Add visualization and connections
- Add integration with WordDetail
- Deploy

---

## Future Enhancements

1. **AI-Assisted Instance Discovery:** Use LLM to suggest instances of an idea from a given source
2. **Idea Export:** Export idea networks as visual graphs (PNG/SVG) or interactive HTML
3. **Collaborative Networks:** Share idea networks with other users (read-only or collaborative)
4. **Timeline Visualization:** Show how an idea evolves across sources in chronological order
5. **Semantic Search:** Find similar ideas or instances using embeddings
6. **Idea Templates:** Pre-built networks for common books/topics (e.g., "Blink Analysis Template")
7. **Argument Mapping:** Extend connections to show full argument structures (premises → conclusion)

---

## Conclusion

Ideas Mode transforms Name of the Words into a tool for analytical reading and intellectual research. By separating Primary Ideas from their instances, allowing connections between ideas, and providing network visualization, the feature enables users to understand how concepts relate and evolve across sources.

The implementation follows existing patterns in the codebase (user isolation, protected procedures, storage layer abstraction) and integrates seamlessly with the word collection features. The phased rollout allows for iterative development and user feedback.
