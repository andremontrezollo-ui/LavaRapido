import { describe, it, expect } from "vitest";
import { distributePercentages, getTotalPercentage } from "@/lib/distribution";
import type { DestinationAddress } from "@/components/mixing/DestinationList";

function makeDests(count: number): DestinationAddress[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    address: "",
    percentage: 0,
  }));
}

describe("distributePercentages", () => {
  it("single destination always gets 100%", () => {
    const result = distributePercentages([
      { id: "1", address: "", percentage: 50 },
    ]);
    expect(result[0].percentage).toBe(100);
    expect(getTotalPercentage(result)).toBe(100);
  });

  it("two destinations each get 50%", () => {
    const result = distributePercentages(makeDests(2));
    expect(result[0].percentage).toBe(50);
    expect(result[1].percentage).toBe(50);
    expect(getTotalPercentage(result)).toBe(100);
  });

  it("three destinations: 33%, 33%, 34% (last absorbs remainder)", () => {
    const result = distributePercentages(makeDests(3));
    expect(result[0].percentage).toBe(33);
    expect(result[1].percentage).toBe(33);
    expect(result[2].percentage).toBe(34);
    expect(getTotalPercentage(result)).toBe(100);
  });

  it("four destinations: 25% each", () => {
    const result = distributePercentages(makeDests(4));
    result.forEach((d) => expect(d.percentage).toBe(25));
    expect(getTotalPercentage(result)).toBe(100);
  });

  it("five destinations sum always equals 100 (edge case with remainder)", () => {
    const result = distributePercentages(makeDests(5));
    expect(getTotalPercentage(result)).toBe(100);
  });

  it("total is exactly 100 for 1 through 5 destinations", () => {
    for (let n = 1; n <= 5; n++) {
      const result = distributePercentages(makeDests(n));
      expect(getTotalPercentage(result)).toBe(100);
    }
  });

  it("preserves id and address properties when redistributing", () => {
    const dests: DestinationAddress[] = [
      { id: "abc", address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", percentage: 60 },
      { id: "def", address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", percentage: 40 },
    ];
    const result = distributePercentages(dests);
    expect(result[0].id).toBe("abc");
    expect(result[0].address).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    expect(result[1].id).toBe("def");
  });

  it("returns empty array for empty input", () => {
    expect(distributePercentages([])).toEqual([]);
  });
});

describe("getTotalPercentage", () => {
  it("sums all destination percentages", () => {
    const dests: DestinationAddress[] = [
      { id: "1", address: "", percentage: 60 },
      { id: "2", address: "", percentage: 30 },
      { id: "3", address: "", percentage: 10 },
    ];
    expect(getTotalPercentage(dests)).toBe(100);
  });

  it("returns 0 for empty array", () => {
    expect(getTotalPercentage([])).toBe(0);
  });

  it("detects when total is not 100", () => {
    const dests: DestinationAddress[] = [
      { id: "1", address: "", percentage: 60 },
      { id: "2", address: "", percentage: 30 },
    ];
    expect(getTotalPercentage(dests)).toBe(90);
    expect(getTotalPercentage(dests)).not.toBe(100);
  });
});
