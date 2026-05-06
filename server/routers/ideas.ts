/**
 * Ideas Mode tRPC Router
 * Exposes all CRUD operations for Primary Ideas, Instances, Connections, and Networks
 * with Zod validation and protected access.
 */

import { protectedProcedure, router } from "../_core/trpc";
import { ideasStorage } from "../storage.ideas";
import { z } from "zod";

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
  // ========== PRIMARY IDEAS ==========

  createPrimary: protectedProcedure
    .input(z.object({
      term: z.string().min(1).max(255),
      description: z.string().optional(),
      originLanguage: z.string().optional().default("english"),
      primarySource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.createPrimaryIdea(ctx.user.openId, input);
    }),

  getPrimary: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getPrimaryIdea(input, ctx.user.openId);
    }),

  listPrimaries: protectedProcedure
    .query(async ({ ctx }) => {
      return ideasStorage.getAllPrimaryIdeas(ctx.user.openId);
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
      return ideasStorage.updatePrimaryIdea(id, ctx.user.openId, updates);
    }),

  deletePrimary: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.deletePrimaryIdea(input, ctx.user.openId);
    }),

  // ========== INSTANCES ==========

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
      return ideasStorage.createInstance(ctx.user.openId, input);
    }),

  getInstancesByIdea: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getInstancesByPrimaryIdea(input, ctx.user.openId);
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
      return ideasStorage.updateInstance(id, ctx.user.openId, updates);
    }),

  deleteInstance: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.deleteInstance(input, ctx.user.openId);
    }),

  getLinkedIdeasForWord: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getLinkedIdeasForWord(input, ctx.user.openId);
    }),

  // ========== CONNECTIONS ==========

  createConnection: protectedProcedure
    .input(z.object({
      ideaPrimaryIdA: z.number(),
      ideaPrimaryIdB: z.number(),
      connectionType: z.enum(CONNECTION_TYPES).optional(),
      description: z.string().optional(),
      strength: z.number().min(1).max(10).optional().default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.createConnection(ctx.user.openId, input);
    }),

  getConnectionsForIdea: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getConnectionsForIdea(input, ctx.user.openId);
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
      return ideasStorage.updateConnection(id, ctx.user.openId, updates);
    }),

  deleteConnection: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.deleteConnection(input, ctx.user.openId);
    }),

  // ========== NETWORKS ==========

  createNetwork: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      primarySource: z.string().optional(),
      ideaPrimaryIds: z.array(z.number()),
      centralIdeaIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.createNetwork(ctx.user.openId, input);
    }),

  getNetwork: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getNetwork(input, ctx.user.openId);
    }),

  listNetworks: protectedProcedure
    .query(async ({ ctx }) => {
      return ideasStorage.getAllNetworks(ctx.user.openId);
    }),

  getNetworkWithDetails: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getNetworkWithDetails(input, ctx.user.openId);
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
      return ideasStorage.updateNetwork(id, ctx.user.openId, updates);
    }),

  deleteNetwork: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.deleteNetwork(input, ctx.user.openId);
    }),

  // ========== CENTRAL THESIS ==========

  setCentral: protectedProcedure
    .input(z.object({
      networkId: z.number(),
      ideaPrimaryId: z.number(),
      isCentral: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ideasStorage.setCentralIdea(
        input.networkId,
        input.ideaPrimaryId,
        ctx.user.openId,
        input.isCentral,
      );
    }),

  // ========== NETWORK CONNECTIONS ==========

  createNetworkConnection: protectedProcedure
    .input(z.object({
      networkIdA: z.number(),
      networkIdB: z.number(),
      connectionType: z.enum(["related", "contrast", "supports", "contradicts", "precedes", "enables"]).optional().default("related"),
      description: z.string().optional(),
      strength: z.number().min(1).max(10).optional().default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.createNetworkConnection(ctx.user.openId, input);
    }),

  getNetworkConnections: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ideasStorage.getNetworkConnections(input, ctx.user.openId);
    }),

  updateNetworkConnection: protectedProcedure
    .input(z.object({
      id: z.number(),
      connectionType: z.string().optional(),
      description: z.string().optional(),
      strength: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return ideasStorage.updateNetworkConnection(id, ctx.user.openId, updates);
    }),

  deleteNetworkConnection: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return ideasStorage.deleteNetworkConnection(input, ctx.user.openId);
    }),
});
