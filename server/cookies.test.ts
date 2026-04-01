import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";
import type { TrpcContext } from "./_core/context";

function createRequest(
  protocol: "http" | "https",
  headers: Record<string, string | string[] | undefined> = {}
) {
  return {
    protocol,
    headers,
  } as TrpcContext["req"];
}

describe("getSessionCookieOptions", () => {
  it("uses Secure + SameSite=None for https requests", () => {
    const options = getSessionCookieOptions(createRequest("https"));
    expect(options).toMatchObject({
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("uses Secure + SameSite=None when forwarded proto is https", () => {
    const options = getSessionCookieOptions(
      createRequest("http", { "x-forwarded-proto": "https" })
    );
    expect(options).toMatchObject({
      secure: true,
      sameSite: "none",
    });
  });

  it("uses SameSite=Lax on non-https requests", () => {
    const options = getSessionCookieOptions(createRequest("http"));
    expect(options).toMatchObject({
      secure: false,
      sameSite: "lax",
    });
  });
});
