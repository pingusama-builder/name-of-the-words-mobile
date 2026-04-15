import type { Request } from "express";
import { sdk } from "./sdk";

/**
 * Extracts the authenticated user's openId from the request session cookie.
 * Returns null if not authenticated — all callers treat null as "anonymous".
 */
export async function getUserFromRequest(req: Request): Promise<string | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    return user?.openId ?? null;
  } catch {
    return null;
  }
}
