import { describe, it, expect } from "vitest";
import { generateInviteToken } from "./token";

describe("generateInviteToken", () => {
  it("produces a url-safe string of at least 22 chars", () => {
    const t = generateInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  });
  it("produces a different token each call", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
  });
});
