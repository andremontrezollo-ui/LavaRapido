import { describe, it, expect } from "vitest";
import { isValidBitcoinAddress, sanitizeInput, contactFormSchema, generateTicketId } from "@/lib/validation";

describe("isValidBitcoinAddress", () => {
  it("validates legacy addresses (P2PKH)", () => {
    expect(isValidBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true);
  });

  it("validates P2SH addresses", () => {
    expect(isValidBitcoinAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBe(true);
  });

  it("validates bech32 addresses", () => {
    expect(isValidBitcoinAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(isValidBitcoinAddress("")).toBe(false);
  });

  it("rejects random strings", () => {
    expect(isValidBitcoinAddress("notabitcoinaddress")).toBe(false);
  });

  it("rejects too-short addresses", () => {
    expect(isValidBitcoinAddress("1A1zP")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isValidBitcoinAddress(null as any)).toBe(false);
    expect(isValidBitcoinAddress(undefined as any)).toBe(false);
  });
});

describe("sanitizeInput", () => {
  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("removes null bytes", () => {
    expect(sanitizeInput("hello\0world")).toBe("helloworld");
  });

  it("collapses excessive whitespace", () => {
    expect(sanitizeInput("hello     world")).toBe("hello  world");
  });

  it("handles empty/null input", () => {
    expect(sanitizeInput("")).toBe("");
    expect(sanitizeInput(null as any)).toBe("");
  });
});

describe("contactFormSchema", () => {
  it("validates a correct form", () => {
    const result = contactFormSchema.safeParse({
      subject: "Test subject",
      message: "This is a valid test message for validation",
      replyContact: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects too-short subject", () => {
    const result = contactFormSchema.safeParse({
      subject: "ab",
      message: "This is a valid test message for validation",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-short message", () => {
    const result = contactFormSchema.safeParse({
      subject: "Valid subject",
      message: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty replyContact", () => {
    const result = contactFormSchema.safeParse({
      subject: "Valid subject",
      message: "This is a valid test message for validation",
      replyContact: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("generateTicketId", () => {
  it("starts with TKT-", () => {
    expect(generateTicketId()).toMatch(/^TKT-/);
  });

  it("has correct length (TKT- + 6 chars)", () => {
    expect(generateTicketId()).toHaveLength(10);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateTicketId()));
    expect(ids.size).toBe(50);
  });
});
