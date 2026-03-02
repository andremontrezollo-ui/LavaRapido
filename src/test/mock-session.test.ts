import { describe, it, expect } from "vitest";
import { generateMockTestnetAddress, generateSessionId, createMockSession } from "@/lib/mock-session";

describe("generateMockTestnetAddress", () => {
  it("starts with tb1q", () => {
    expect(generateMockTestnetAddress()).toMatch(/^tb1q/);
  });

  it("has consistent length", () => {
    const addr = generateMockTestnetAddress();
    expect(addr.length).toBe(42); // tb1q + 38
  });

  it("generates unique addresses", () => {
    const addrs = new Set(Array.from({ length: 20 }, () => generateMockTestnetAddress()));
    expect(addrs.size).toBe(20);
  });
});

describe("generateSessionId", () => {
  it("matches UUID v4 format", () => {
    expect(generateSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});

describe("createMockSession", () => {
  it("returns complete session object", () => {
    const session = createMockSession();
    expect(session.sessionId).toBeTruthy();
    expect(session.depositAddress).toMatch(/^tb1q/);
    expect(session.status).toBe("pending_deposit");
    expect(session.expiresAt.getTime()).toBeGreaterThan(session.createdAt.getTime());
  });

  it("generates unique sessions each call", () => {
    const s1 = createMockSession();
    const s2 = createMockSession();
    expect(s1.sessionId).not.toBe(s2.sessionId);
    expect(s1.depositAddress).not.toBe(s2.depositAddress);
  });
});
