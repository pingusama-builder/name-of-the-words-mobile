import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: mocks.authenticateRequest,
  },
}));

import { getExportAuthenticationState } from "./_core/auth-helper";

function requestWithCookie(cookie?: string): Request {
  return { headers: cookie ? { cookie } : {} } as Request;
}

describe("getExportAuthenticationState", () => {
  beforeEach(() => {
    mocks.authenticateRequest.mockReset();
  });

  it("classifies an absent session as intentional anonymous export access", async () => {
    await expect(getExportAuthenticationState(requestWithCookie())).resolves.toEqual({ kind: "anonymous" });
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("classifies a verified session as authenticated export access", async () => {
    mocks.authenticateRequest.mockResolvedValue({ openId: "user-123" });

    await expect(
      getExportAuthenticationState(requestWithCookie(`${COOKIE_NAME}=valid-session`)),
    ).resolves.toEqual({ kind: "authenticated", userId: "user-123" });
  });

  it("classifies an invalid present session without falling back to anonymous export", async () => {
    mocks.authenticateRequest.mockRejectedValue(ForbiddenError("Invalid session cookie"));

    await expect(
      getExportAuthenticationState(requestWithCookie(`${COOKIE_NAME}=expired-session`)),
    ).resolves.toEqual({ kind: "invalid-session" });
  });

  it("classifies unexpected authentication failures separately from an invalid session", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("OAuth dependency unavailable"));

    await expect(
      getExportAuthenticationState(requestWithCookie(`${COOKIE_NAME}=present-session`)),
    ).resolves.toEqual({ kind: "authentication-failed" });
  });
});
