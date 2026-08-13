import type { Request } from "express";
import { sdk } from "./sdk";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { HttpError } from "@shared/_core/errors";

export type ExportAuthenticationState =
  | { kind: "authenticated"; userId: string }
  | { kind: "anonymous" }
  | { kind: "invalid-session" }
  | { kind: "authentication-failed" };

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

/**
 * Export has a deliberate anonymous mode, so it must distinguish an absent
 * session from a present-but-invalid session or an authentication failure.
 */
export async function getExportAuthenticationState(req: Request): Promise<ExportAuthenticationState> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const sessionCookie = cookies[COOKIE_NAME];

  if (!sessionCookie) {
    return { kind: "anonymous" };
  }

  try {
    const user = await sdk.authenticateRequest(req);
    if (!user?.openId) {
      return { kind: "authentication-failed" };
    }
    return { kind: "authenticated", userId: user.openId };
  } catch (error) {
    if (error instanceof HttpError && error.message === "Invalid session cookie") {
      return { kind: "invalid-session" };
    }
    return { kind: "authentication-failed" };
  }
}
