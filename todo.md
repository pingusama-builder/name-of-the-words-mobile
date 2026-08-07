- [x] Fix word saving: register REST API routes (/api/words, /api/tags, etc.) in template server/_core/index.ts
- [x] Add Import/Export as a proper view with its own icon in the bottom navigation bar
- [x] Test word saving end-to-end (add word, verify persistence on refresh)
- [x] Test import/export functionality
- [x] Add 'word named' success animation after the rotation animation in AddWord
- [x] Add Import/Export as a proper view with its own icon in the bottom navigation bar
- [x] Thoroughly test: save 5 unique words with different settings and verify persistence on refresh
- [x] Test word saving through the actual AddWord UI and verify persistence after browser refresh
- [x] Test Import/Export through the bottom-nav UI
- [x] Fix outstanding TS errors (disableTransition, usePersistFn, ComponentShowcase, imageGeneration storagePut)
- [x] Rebuild CalendarView with BookDiamond-inspired diamond indicators per date (1 word = single solid diamond, 2 = inner gem + outer facet ring, 3+ = stacked layered diamonds, each word in distinct color)
- [x] Add userId to words table and migrate DB (ALTER TABLE)
- [x] Wire Manus OAuth login: show login button when unauthenticated, scope all word API calls to current user
- [x] Build edit word card: tap word card → slide-up sheet pre-filled with existing data, save updates via PUT /api/words/:id
- [x] Fix BookDiamond calendar: each word gets unique stored color; 1=solid gem, 2=gem+outer ring, 3+=stacked layers
- [x] Fix TypeScript errors in routes.ts: await getUserFromRequest, add updateWord to storage
- [x] Push DB schema with pnpm db:push to ensure users table exists in MySQL
- [x] Add Login/Logout button + user avatar/name in app header (Home.tsx)
- [x] Test login flow end-to-end in browser
- [x] Write vitest tests for auth helper and word scoping
- [x] Fix tag saving: new tags added with a word must be persisted to the tags table and appear in tag cloud view
- [x] Fix tag cloud: TagCloud component reads tags from word.tags JSON field (already correct, root cause was server-side)
- [x] Add tag autocomplete in AddWord: show existing tags as suggestions when typing
- [x] Remove all occurrences of "Mobile First" / "Mobile first" from the entire project (no user-visible text)
- [x] Add PUT /api/words/:id endpoint to routes.ts with auth scoping (already implemented)
- [x] Add updateWord helper to storage.ts (already implemented)
- [x] Build EditWord slide-up sheet component pre-filled with word data (all fields: word, language, meaning, context, paired word, ratings, tags)
- [x] Wire edit button into WordDetail view (tap pencil icon → opens EditWord sheet)
- [x] Write vitest tests for PUT /api/words/:id endpoint
- [x] Build Diamond SVG component: 1=solid gem, 2=gem+outer facet ring, 3+=stacked layered diamonds, unique color per word
- [x] Wire Diamond into CalendarView day cells using /api/calendar data
- [x] Test CalendarView diamond indicators end-to-end in browser
- [x] Add color column to words table (ALTER TABLE), assign random unique color on word creation
- [x] Update calendar API to return per-word colors alongside wordIds
- [x] Update Diamond component to use colors array from API (not derived from ID)
- [x] Fix: switching to Calendar view causes blank screen and all nav buttons stop working — fixed by h-screen flex layout with shrink-0 nav + ViewErrorBoundary around CalendarView
- [x] Verify bottom navigation end-to-end from Calendar view: Collection, Add Word, Tags, Import/Export must each switch views correctly
- [x] Fix timezone: send local date from browser as dateAdded instead of deriving UTC date on server
- [x] Fix user isolation: authenticated users must only see their own words (not NULL-userId legacy words); new users get a clean slate
- [x] Scope getWordById by userId to prevent cross-user access by ID (PUT and DELETE now check ownership)
- [x] Update import flow: uses dateAdded from imported file (server-side fallback to UTC is acceptable for imports)
- [x] Update header logo: show "Name of the Words" in font-serif + "言之名" below/beside it, matching landing page typography
- [x] Add `page` (location/page number) and `source` (book title / source name) fields to words schema and DB
- [x] Update AddWord and EditWord forms to include page and source fields
- [x] Build source swipe deck: a view that groups words by source and lets users swipe through cards from the same source
- [x] Update header logo: bilingual lockup "Name of the Words" (font-serif) + "言之名" (muted tracked), matching landing page style
- [x] Add source (text), location (free text display), locationOrder (int, auto-extracted) to words schema and DB
- [x] Update AddWord form: add source and location fields
- [x] Update EditWord form: add source and location fields
- [x] Build SourcesList view: list all sources with word count badge, tap to open swipe deck
- [x] Build SwipeDeck view: full-screen card swiper for words from one source, sorted by locationOrder
- [x] Add Sources tab to bottom nav (replace Import/Export slot)
- [x] Move Import/Export into user avatar dropdown menu
- [x] Update export format to include source, location, locationOrder fields
- [x] Update import to parse and store source, location, locationOrder fields (no backward compat needed)
- [x] Seed 3 onboarding words (Essence, Beauty, Subtlety) for new users with meanings as app guides
- [x] Add shared_decks table to DB schema (token, title, wordIds JSON, createdAt, ownerUserId)
- [x] Add POST /api/share endpoint (create shared deck from selected word IDs)
- [x] Add GET /api/share/:token endpoint (public, returns deck metadata + words)
- [x] Add DELETE /api/share/:token endpoint (owner can revoke)
- [x] Build batch-select mode in collection view (checkbox per card, select-all, deselect-all)
- [x] Add source-deck select-all button in SourceDeck to select all words from that source
- [x] Wire batch delete action (confirm dialog → delete selected words)
- [x] Wire batch share action (opens share sheet → creates link → shows copyable URL)
- [x] Build public SharedDeckViewer page at /share/:token (no auth required, full swipe deck)
- [x] Add /share/:token route to App.tsx (non-hash, accessible without login)
- [x] Write user-facing product introduction document (ABOUT.md)
- [x] Add GET /api/stats endpoint returning global user count (Seekers) and total word count (Words Named)
- [x] Display Seekers and Words Named on Landing page (subtle, below the title)

## Work Mode
- [x] Add isWork column (boolean, default false) to words table via DB migration
- [x] Add user_preferences table (userId, workMode boolean) via DB migration
- [x] Update shared/schema.ts to include isWork field on words
- [x] Add server endpoints: GET/POST /api/preferences (get/set workMode per user)
- [x] Update storage getAllWords, getWordsByDate, searchWords, getCalendarDates to accept isWork filter
- [x] Update all GET /api/words and related routes to pass isWork filter from query param
- [x] Build WorkModeContext (React context) to hold current mode state, synced with server preference
- [x] Add Work Mode toggle switch to user avatar dropdown in Home.tsx header
- [x] Apply mode filter to collection view, calendar, tag cloud, sources view (client-side via context)
- [x] Update AddWord form: tag new words with current mode (isWork), hide ratings in Work mode
- [x] Update EditWord form: show/hide ratings based on word's isWork flag, allow toggling isWork on existing words
- [x] Update export to include isWork column; import parses isWork field
- [x] Visual distinction in Work mode: muted header badge, slightly different accent, no rating bars in cards

## Contrast / Readability
- [x] Boost placeholder text opacity in AddWord, EditWord, and global CSS (too faint on desktop)
- [x] Boost section label (SOURCE, PERFECT MATCH PAIR, etc.) contrast in AddWord/EditWord
- [x] Ensure input field typed text is clearly visible against dark background
- [x] Change context/quote preview text color in WordCard to #7bbfbb (teal tint, legible on dark bg)

## Desktop Responsive Layout
- [x] Add CSS desktop font scaling (112.5% at 1024px+, 118.75% at 1440px+) — equivalent to ~115% browser zoom, no layout changes needed

## Tappable Filters
- [x] Add activeLanguage and activeTag filter state to Home.tsx collection view
- [x] Render dismissible filter chip bar above word list when a filter is active (shows active filter + × to clear)
- [x] Apply language/tag filter to displayedWords in collection view
- [x] Update WordCard: make language badge tappable (calls onLanguageClick), make tag chips tappable (calls onTagClick)
- [x] Source chips on word cards already open SourceDeck — confirmed still working
- [x] Add persistent language filter pill row above collection (always visible, shows languages present in word bank, All + per-language pills)
- [x] Clear all test/seed data from DB (test words, test users)
- [x] Fix Seekers stat: count DISTINCT openId from users table (deduped real sign-ins)
- [x] Fix Words Named stat: count only words WHERE user_id IS NOT NULL


## Ideas Mode — Phase 1: Core Data Model & API

### Database Schema (Drizzle Migrations)
- [x] Add `idea_primaries` table to drizzle/schema.ts (id, userId, term, description, originLanguage, createdAt, updatedAt, color, primarySource, posX, posY)
- [x] Add `idea_instances` table to drizzle/schema.ts (id, ideaPrimaryId, userId, wordId, context, source, location, locationOrder, meaning, interpretation, dateEncountered, createdAt, updatedAt)
- [x] Add `idea_connections` table to drizzle/schema.ts (id, userId, ideaPrimaryIdA, ideaPrimaryIdB, connectionType, description, strength, createdAt, updatedAt) with CHECK constraint (A < B)
- [x] Add `idea_networks` table to drizzle/schema.ts (id, userId, title, description, primarySource, createdAt, updatedAt)
- [x] Add `idea_network_primaries` junction table to drizzle/schema.ts (id, networkId, ideaPrimaryId, isCentral) with proper foreign keys and indexes
- [x] Run `pnpm db:push` to apply migrations to MySQL

### Type Definitions
- [x] Add IdeaPrimary, IdeaInstance, IdeaConnection, IdeaNetwork, IdeaNetworkPrimary types to shared/schema.ts
- [x] Add CONNECTION_TYPES enum to shared/schema.ts (contrast, supports, contradicts, precedes, enables)

### Utility Functions
- [x] Create shared/utils.ts with extractLocationOrder(location: string) function (handles "p. 42", "Ch. 4", timestamps, etc.)
- [x] Add generateUniqueColor() utility to server/utils.ts for auto-generating idea colors

### Storage Layer (`server/storage.ideas.ts`)
- [x] Extend IStorage interface with idea methods (createPrimaryIdea, getPrimaryIdea, getAllPrimaryIdeas, updatePrimaryIdea, deletePrimaryIdea)
- [x] Extend IStorage interface with instance methods (createInstance, getInstancesByPrimaryIdea, updateInstance, deleteInstance)
- [x] Extend IStorage interface with connection methods (createConnection, getConnectionsForIdea, updateConnection, deleteConnection)
- [x] Extend IStorage interface with network methods (createNetwork, getNetwork, getAllNetworks, updateNetwork, deleteNetwork, getNetworkWithDetails)
- [x] Extend IStorage interface with setCentralIdea(networkId, ideaPrimaryId, userId, isCentral) method
- [x] Implement all storage methods with user isolation (userId filter on all queries)
- [x] Implement connection normalization (always store smaller ID in ideaPrimaryIdA)
- [x] Implement location order auto-extraction in createInstance and updateInstance
- [x] Implement word ownership validation in createInstance (guard against cross-user wordId references)
- [x] Implement setCentralIdea with network ownership check and junction row validation

### API Procedures (`server/routers/ideas.ts`)
- [x] Create new file server/routers/ideas.ts with ideaRouter
- [x] Implement createPrimary procedure with Zod validation
- [x] Implement getPrimary procedure
- [x] Implement listPrimaries procedure
- [x] Implement updatePrimary procedure
- [x] Implement deletePrimary procedure
- [x] Implement createInstance procedure with ISO date validation (YYYY-MM-DD) and wordId ownership check
- [x] Implement getInstancesByIdea procedure
- [x] Implement updateInstance procedure (includes source, location, dateEncountered fields)
- [x] Implement deleteInstance procedure
- [x] Implement createConnection procedure with connection type enum validation and normalization
- [x] Implement getConnectionsForIdea procedure (queries both ideaPrimaryIdA and B)
- [x] Implement updateConnection procedure
- [x] Implement deleteConnection procedure
- [x] Implement createNetwork procedure (accepts optional centralIdeaIds)
- [x] Implement getNetwork procedure
- [x] Implement listNetworks procedure
- [x] Implement getNetworkWithDetails procedure (returns ideas with isCentral flag attached)
- [x] Implement updateNetwork procedure
- [x] Implement deleteNetwork procedure
- [x] Implement setCentral procedure (toggle centrality with authorization checks)
- [x] Register ideaRouter in server/routers.ts (append to appRouter)

### Testing (`server/storage.ideas.test.ts`)
- [x] Create server/storage.ideas.test.ts test file
- [x] Test createPrimaryIdea (auto-generated color, user isolation)
- [x] Test getPrimaryIdea (respects user isolation)
- [x] Test getAllPrimaryIdeas (returns only user's ideas)
- [x] Test updatePrimaryIdea (ownership check)
- [x] Test deletePrimaryIdea (cascades to instances and connections)
- [x] Test createInstance (auto-extracts locationOrder, validates wordId ownership, validates dateEncountered format)
- [x] Test getInstancesByPrimaryIdea (returns all instances for an idea)
- [x] Test updateInstance (can edit all fields including source/location/dateEncountered)
- [x] Test deleteInstance
- [x] Test createConnection (normalizes direction A < B, prevents self-connections)
- [x] Test createConnection (prevents duplicate edges when inserting in reverse order)
- [x] Test getConnectionsForIdea (queries both directions, Issue 7)
- [x] Test updateConnection
- [x] Test deleteConnection
- [x] Test createNetwork (creates junction records, marks centralIdeaIds correctly)
- [x] Test getNetworkWithDetails (returns ideas with isCentral flag)
- [x] Test updateNetwork (can add/remove ideas)
- [x] Test deleteNetwork (cascades via junction table)
- [x] Test setCentralIdea (toggles centrality, rejects unauthorized user, validates junction exists)
- [x] Run `pnpm test` and verify all tests pass

### Verification & Checkpoint
- [x] Verify no TypeScript errors: `pnpm tsc --noEmit`
- [x] Verify all tests pass: `pnpm test`
- [x] Verify database schema is correct: `pnpm db:push` (should show no pending changes)
- [x] Create checkpoint: "Phase 1 complete: Ideas Mode core data model and API"


## Ideas Mode — Phase 2: Frontend Components (COMPLETE)

### Components Created
- [x] Create IdeaNetworkView component (list networks, create, delete)
- [x] Create IdeaNetworkDetail component (view/edit ideas in network)
- [x] Create PrimaryIdeaDetail component (manage instances of single idea)
- [x] Create ConnectionDetail component (create connections between ideas)
- [x] Integrate Ideas Mode into Home.tsx navigation

### Integration
- [x] Add Ideas Mode as new view in Home.tsx
- [x] Add Ideas Mode button to bottom navigation bar
- [x] Wire Ideas Mode view to show/hide with other views
- [x] Add ViewErrorBoundary around Ideas Mode

### Verification
- [x] TypeScript compilation successful (zero errors)
- [x] All components render without runtime errors
- [x] Navigation between views works correctly


## Ideas Mode — Phase 4: Integration & Polish

### Quick-Create & Navigation
- [x] Add floating action button (FAB) in IdeaNetworkView for quick idea creation
- [x] Add "Create Network" button in IdeaNetworkView header
- [x] Add Ideas Mode badge to bottom nav showing count of networks
- [x] Add breadcrumb navigation in IdeaNetworkDetail (Network > Idea)
- [x] Fix cache invalidation for instant network list updates

### WordDetail Integration
- [x] Add "Add to Idea" button in WordDetail component
- [x] Create AddToIdeaDialog component for selecting/creating idea and network
- [x] Implement createInstance from WordDetail context
- [x] Auto-populate instance source/location from word metadata
- [x] Show linked ideas in WordDetail (if word is used in any ideas)

### Navigation & UX
- [x] Add Ideas Mode to main Home.tsx navigation (tab 6 of 6)
- [x] Update bottom nav styling to accommodate 6 tabs
- [x] Add Ideas Mode badge to bottom nav showing count of networks
- [x] Add "Back" button in IdeaNetworkDetail and PrimaryIdeaDetail

### Instance Creation Flow
- [x] Add "Create Instance" button in PrimaryIdeaDetail
- [x] Create InstanceForm component with context, source, location, meaning fields
- [x] Add word linking in InstanceForm (optional word selection)
- [ ] Implement bulk instance creation from multiple words

### Mobile UX Polish
- [ ] Ensure graph visualization is touch-friendly on mobile
- [ ] Add swipe gestures for navigation (back/forward)
- [ ] Optimize IdeaNetworkGraph for small screens
- [ ] Add collapsible panels for instance details on mobile

### Testing & Verification
- [x] Test Ideas Mode navigation from all entry points
- [x] Test WordDetail → Ideas Mode integration
- [x] Test instance creation from word context
- [x] Test graph visualization on mobile (if applicable)
- [x] Verify no TypeScript errors
- [x] Create checkpoint: "Phase 4 complete: Ideas Mode fully integrated"


## Ideas Mode — Phase 5: Full Editing Workflows (COMPLETE)

### Editing Capabilities
- [x] IdeaNetworkDetail shows PrimaryIdeaDetail when idea is tapped
- [x] PrimaryIdeaDetail has Edit button for term and description
- [x] InstanceForm captures all fields (context, location, meaning, interpretation, dateEncountered)
- [x] Users can edit instances after creation
- [x] WordDetail shows linked ideas section
- [x] New tRPC query: ideas.getLinkedIdeasForWord
- [x] Backend method: storage.getLinkedIdeasForWord

### UI Enhancements
- [x] "New" button in IdeaNetworkView header for quick network creation
- [x] Breadcrumb navigation in IdeaNetworkDetail (Networks / Network Title)

### Testing
- [x] Created ideas.workflows.test.ts with comprehensive tests
- [x] Tests cover: network CRUD, idea CRUD, instance creation with full fields, linked ideas retrieval
- [x] All tests passing (13/13 passed)

## Ideas Mode — Phase 6: Network Connections & Polish

### Network-to-Network Connections
- [x] Add ideaNetworkConnections table to schema
- [x] Implement storage layer methods (create, get, update, delete)
- [x] Implement tRPC procedures for network connections
- [x] Create ConnectNetworkDialog component
- [x] Integrate connect button into IdeaNetworkView
- [x] Support 6 connection types (related, contrast, supports, contradicts, precedes, enables)
- [x] Add connection strength slider (1-10)
- [x] Add optional description field

### Remaining Polish Items (Optional/Deferred)
- [x] Add floating action button (FAB) in IdeaNetworkView for quick idea creation
- [x] Add Ideas Mode badge to bottom nav showing count of networks
- [ ] Ensure graph visualization is touch-friendly on mobile (D3 drag already works)
- [ ] Add swipe gestures for navigation (back/forward) - nice-to-have
- [ ] Optimize IdeaNetworkGraph for small screens - performance optimization
- [ ] Add collapsible panels for instance details on mobile - UX enhancement
- [ ] Implement bulk instance creation from multiple words - advanced feature

NOTE: Ideas Mode is fully functional. Remaining items are optional enhancements.

## Bug Fixes & Missing Features

### Network Editing
- [x] Add edit button to network cards in IdeaNetworkView
- [x] Create EditNetworkDialog component (title, description)
- [x] Implement updateNetwork mutation for editing
- [x] Wire edit dialog to network card

### Design Rule: Every New Item Must Have Edit
- [x] Add edit capability to all new features (networks, ideas, instances, connections)
- [x] Ensure delete operations are paired with edit operations
- [x] Add edit button/icon to every list item component


## Word List Pagination

### Implementation
- [x] Add limit parameter to word list queries (backend)
- [x] Add show-all toggle to options menu
- [x] Update word list components to use limit (10 latest by default)
- [x] Apply to all word views (normal, work, mutual arising)
- [x] Test pagination and toggle functionality
