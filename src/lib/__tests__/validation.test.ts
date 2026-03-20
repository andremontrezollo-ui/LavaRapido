import { describe, it, expect } from "vitest";
import {
  isValidBitcoinAddress,
  contactFormSchema,
  generateTicketId,
} from "@/lib/validation";

describe("isValidBitcoinAddress", () => {
  describe("valid addresses", () => {
    it("accepts P2PKH legacy address (starts with 1)", () => {
      expect(isValidBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true);
    });

    it("accepts P2SH address (starts with 3)", () => {
      expect(isValidBitcoinAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBe(true);
    });

    it("accepts Bech32 SegWit address (bc1q prefix)", () => {
      expect(isValidBitcoinAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
    });

    it("accepts Taproot Bech32m address (bc1p prefix)", () => {
      // bc1p + 58 lowercase alphanumeric chars = 62 total
      expect(
        isValidBitcoinAddress("bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297")
      ).toBe(true);
    });
  });

  describe("invalid addresses", () => {
    it("rejects empty string", () => {
      expect(isValidBitcoinAddress("")).toBe(false);
    });

    it("rejects null", () => {
      expect(isValidBitcoinAddress(null as unknown as string)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(isValidBitcoinAddress(undefined as unknown as string)).toBe(false);
    });

    it("rejects address that is too short", () => {
      expect(isValidBitcoinAddress("1A1zP")).toBe(false);
    });

    it("rejects address that is too long", () => {
      expect(isValidBitcoinAddress("1" + "a".repeat(62))).toBe(false);
    });

    it("rejects address with invalid base58 characters (0, O, I, l)", () => {
      // '0' is not a valid base58 character
      expect(isValidBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv0DivfNa")).toBe(false);
    });

    it("rejects a random non-bitcoin string", () => {
      expect(isValidBitcoinAddress("not-a-bitcoin-address")).toBe(false);
    });

    it("rejects testnet address (tb1q prefix)", () => {
      expect(isValidBitcoinAddress("tb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(false);
    });
  });
});

describe("contactFormSchema", () => {
  const validData = {
    subject: "Help needed",
    message: "I need help with my Bitcoin transaction details",
    replyContact: "user@example.com",
  };

  it("accepts valid form data", () => {
    expect(contactFormSchema.safeParse(validData).success).toBe(true);
  });

  it("sanitizes whitespace from subject", () => {
    const result = contactFormSchema.safeParse({
      ...validData,
      subject: "  Clean Subject  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Clean Subject");
    }
  });

  it("rejects subject shorter than minimum", () => {
    const result = contactFormSchema.safeParse({ ...validData, subject: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toMatch(/3/);
    }
  });

  it("rejects subject longer than maximum (100 chars)", () => {
    const result = contactFormSchema.safeParse({
      ...validData,
      subject: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects message shorter than minimum (10 chars)", () => {
    const result = contactFormSchema.safeParse({ ...validData, message: "Short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toMatch(/10/);
    }
  });

  it("rejects message longer than maximum (2000 chars)", () => {
    const result = contactFormSchema.safeParse({
      ...validData,
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing replyContact (optional field)", () => {
    const { replyContact: _, ...withoutReply } = validData;
    expect(contactFormSchema.safeParse(withoutReply).success).toBe(true);
  });

  it("accepts empty string replyContact", () => {
    expect(
      contactFormSchema.safeParse({ ...validData, replyContact: "" }).success
    ).toBe(true);
  });

  it("rejects replyContact longer than maximum (500 chars)", () => {
    const result = contactFormSchema.safeParse({
      ...validData,
      replyContact: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("generateTicketId", () => {
  it("starts with TKT-", () => {
    expect(generateTicketId()).toMatch(/^TKT-/);
  });

  it("has correct total length (TKT- + 6 chars = 10)", () => {
    expect(generateTicketId()).toHaveLength(10);
  });

  it("uses only safe alphanumeric characters after prefix", () => {
    const id = generateTicketId().slice(4);
    expect(id).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("generates sufficiently unique IDs across 100 calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTicketId()));
    expect(ids.size).toBeGreaterThan(90);
  });
});
