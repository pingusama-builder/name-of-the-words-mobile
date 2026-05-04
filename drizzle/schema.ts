import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, tinyint, float, index, unique } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Ideas Mode tables
export const ideaPrimaries = mysqlTable("idea_primaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  term: varchar("term", { length: 255 }).notNull(),
  description: text("description"),
  originLanguage: varchar("origin_language", { length: 64 }).default("english"),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
  updatedAt: varchar("updated_at", { length: 64 }).notNull(),
  color: varchar("color", { length: 16 }),
  primarySource: varchar("primary_source", { length: 512 }),
  posX: float("pos_x"),
  posY: float("pos_y"),
}, (table) => ({
  userIdIdx: index("idx_idea_primaries_user_id").on(table.userId),
  createdAtIdx: index("idx_idea_primaries_created_at").on(table.createdAt),
}));

export type IdeaPrimary = typeof ideaPrimaries.$inferSelect;
export type InsertIdeaPrimary = typeof ideaPrimaries.$inferInsert;

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
  updatedAt: varchar("updated_at", { length: 64 }).notNull(),
}, (table) => ({
  ideaPrimaryIdIdx: index("idx_idea_instances_idea_primary_id").on(table.ideaPrimaryId),
  userIdIdx: index("idx_idea_instances_user_id").on(table.userId),
  wordIdIdx: index("idx_idea_instances_word_id").on(table.wordId),
}));

export type IdeaInstance = typeof ideaInstances.$inferSelect;
export type InsertIdeaInstance = typeof ideaInstances.$inferInsert;

export const ideaConnections = mysqlTable("idea_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  ideaPrimaryIdA: int("idea_primary_id_a").notNull(),
  ideaPrimaryIdB: int("idea_primary_id_b").notNull(),
  connectionType: varchar("connection_type", { length: 64 }),
  description: text("description"),
  strength: int("strength").default(5),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
  updatedAt: varchar("updated_at", { length: 64 }).notNull(),
}, (table) => ({
  userIdIdx: index("idx_idea_connections_user_id").on(table.userId),
  ideaPrimaryIdAIdx: index("idx_idea_connections_idea_primary_id_a").on(table.ideaPrimaryIdA),
  ideaPrimaryIdBIdx: index("idx_idea_connections_idea_primary_id_b").on(table.ideaPrimaryIdB),
  uniqueConnection: unique("unique_connection").on(table.userId, table.ideaPrimaryIdA, table.ideaPrimaryIdB),
}));

export type IdeaConnection = typeof ideaConnections.$inferSelect;
export type InsertIdeaConnection = typeof ideaConnections.$inferInsert;

export const ideaNetworks = mysqlTable("idea_networks", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  primarySource: varchar("primary_source", { length: 512 }),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
  updatedAt: varchar("updated_at", { length: 64 }).notNull(),
}, (table) => ({
  userIdIdx: index("idx_idea_networks_user_id").on(table.userId),
  createdAtIdx: index("idx_idea_networks_created_at").on(table.createdAt),
}));

export type IdeaNetwork = typeof ideaNetworks.$inferSelect;
export type InsertIdeaNetwork = typeof ideaNetworks.$inferInsert;

export const ideaNetworkPrimaries = mysqlTable("idea_network_primaries", {
  id: int("id").autoincrement().primaryKey(),
  networkId: int("network_id").notNull(),
  ideaPrimaryId: int("idea_primary_id").notNull(),
  isCentral: tinyint("is_central").notNull().default(0),
}, (table) => ({
  networkIdeaUnique: unique("unique_network_idea").on(table.networkId, table.ideaPrimaryId),
  networkIdIdx: index("idx_network_primaries_network_id").on(table.networkId),
  ideaPrimaryIdIdx: index("idx_network_primaries_idea_primary_id").on(table.ideaPrimaryId),
}));

export type IdeaNetworkPrimary = typeof ideaNetworkPrimaries.$inferSelect;
export type InsertIdeaNetworkPrimary = typeof ideaNetworkPrimaries.$inferInsert;

// Word bank tables
export { words, tags, insertWordSchema, insertTagSchema } from "../shared/schema";
export type { Word, InsertWord, Tag, InsertTag } from "../shared/schema";

// Re-export Ideas Mode types for convenience
