import { describe, it, expect } from "vitest";
import {
  redistributePercentages,
  addDestinationWithRebalance,
  removeDestinationWithRebalance,
  updatePercentageWithRebalance,
} from "@/features/mixing/utils/distribution";
import type { Destination } from "@/features/mixing/types/mixing.types";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeDestination(id: string, address: string, percentage: number): Destination {
  return { id, address, percentage };
}

function totalPercentage(destinations: Destination[]): number {
  return destinations.reduce((sum, d) => sum + d.percentage, 0);
}

// ── redistributePercentages ────────────────────────────────────────────────

describe("redistributePercentages", () => {
  it("returns empty array for empty input", () => {
    expect(redistributePercentages([])).toEqual([]);
  });

  it("sets single destination to 100%", () => {
    const dest = makeDestination("1", "", 50);
    const result = redistributePercentages([dest]);
    expect(result).toHaveLength(1);
    expect(result[0].percentage).toBe(100);
  });

  it("distributes evenly for 2 destinations", () => {
    const dests = [makeDestination("1", "", 60), makeDestination("2", "", 40)];
    const result = redistributePercentages(dests);
    expect(totalPercentage(result)).toBe(100);
    expect(result[0].percentage).toBe(50);
    expect(result[1].percentage).toBe(50);
  });

  it("distributes evenly for 3 destinations (remainder to last)", () => {
    const dests = [
      makeDestination("1", "", 0),
      makeDestination("2", "", 0),
      makeDestination("3", "", 0),
    ];
    const result = redistributePercentages(dests);
    expect(totalPercentage(result)).toBe(100);
    // 100 / 3 = 33 each, last gets 34
    expect(result[0].percentage).toBe(33);
    expect(result[1].percentage).toBe(33);
    expect(result[2].percentage).toBe(34);
  });

  it("preserves ids and addresses", () => {
    const dests = [makeDestination("abc", "addr1", 70), makeDestination("def", "addr2", 30)];
    const result = redistributePercentages(dests);
    expect(result[0].id).toBe("abc");
    expect(result[0].address).toBe("addr1");
    expect(result[1].id).toBe("def");
  });

  it("always sums to 100 for various counts", () => {
    for (let count = 1; count <= 5; count++) {
      const dests = Array.from({ length: count }, (_, i) =>
        makeDestination(String(i), "", 0)
      );
      expect(totalPercentage(redistributePercentages(dests))).toBe(100);
    }
  });
});

// ── addDestinationWithRebalance ────────────────────────────────────────────

describe("addDestinationWithRebalance", () => {
  it("adds a destination and rebalances", () => {
    const dests = [makeDestination("1", "", 100)];
    const result = addDestinationWithRebalance(dests, 5);
    expect(result).toHaveLength(2);
    expect(totalPercentage(result)).toBe(100);
  });

  it("does not exceed maxDestinations", () => {
    const dests = Array.from({ length: 5 }, (_, i) =>
      makeDestination(String(i), "", 20)
    );
    const result = addDestinationWithRebalance(dests, 5);
    expect(result).toHaveLength(5);
  });

  it("new destination has empty address", () => {
    const dests = [makeDestination("1", "addr1", 100)];
    const result = addDestinationWithRebalance(dests, 5);
    const newDest = result.find((d) => d.id !== "1");
    expect(newDest?.address).toBe("");
  });
});

// ── removeDestinationWithRebalance ─────────────────────────────────────────

describe("removeDestinationWithRebalance", () => {
  it("does not remove the last destination", () => {
    const dests = [makeDestination("1", "", 100)];
    const result = removeDestinationWithRebalance(dests, "1");
    expect(result).toHaveLength(1);
  });

  it("removes a destination and rebalances", () => {
    const dests = [
      makeDestination("1", "a", 33),
      makeDestination("2", "b", 33),
      makeDestination("3", "c", 34),
    ];
    const result = removeDestinationWithRebalance(dests, "3");
    expect(result).toHaveLength(2);
    expect(totalPercentage(result)).toBe(100);
  });

  it("preserves remaining destinations in order", () => {
    const dests = [
      makeDestination("1", "a", 50),
      makeDestination("2", "b", 50),
    ];
    const result = removeDestinationWithRebalance(dests, "1");
    expect(result[0].id).toBe("2");
  });
});

// ── updatePercentageWithRebalance ──────────────────────────────────────────

describe("updatePercentageWithRebalance", () => {
  it("always keeps total at 100", () => {
    const dests = [
      makeDestination("1", "", 50),
      makeDestination("2", "", 50),
    ];
    const result = updatePercentageWithRebalance(dests, "1", 70);
    expect(totalPercentage(result)).toBe(100);
  });

  it("applies the requested value to the changed destination", () => {
    const dests = [
      makeDestination("1", "", 50),
      makeDestination("2", "", 50),
    ];
    const result = updatePercentageWithRebalance(dests, "1", 70);
    const changed = result.find((d) => d.id === "1")!;
    expect(changed.percentage).toBe(70);
  });

  it("keeps single destination at 100 regardless of input", () => {
    const dests = [makeDestination("1", "", 100)];
    const result = updatePercentageWithRebalance(dests, "1", 50);
    expect(result[0].percentage).toBe(100);
  });

  it("enforces minimum percentage of 10 on changed destination", () => {
    const dests = [
      makeDestination("1", "", 50),
      makeDestination("2", "", 50),
    ];
    const result = updatePercentageWithRebalance(dests, "1", 5);
    const changed = result.find((d) => d.id === "1")!;
    expect(changed.percentage).toBeGreaterThanOrEqual(10);
    expect(totalPercentage(result)).toBe(100);
  });

  it("enforces minimum of 10 on other destinations", () => {
    const dests = [
      makeDestination("1", "", 50),
      makeDestination("2", "", 25),
      makeDestination("3", "", 25),
    ];
    const result = updatePercentageWithRebalance(dests, "1", 90);
    result.filter((d) => d.id !== "1").forEach((d) => {
      expect(d.percentage).toBeGreaterThanOrEqual(10);
    });
    expect(totalPercentage(result)).toBe(100);
  });

  it("handles NaN gracefully by clamping to minimum", () => {
    const dests = [
      makeDestination("1", "", 50),
      makeDestination("2", "", 50),
    ];
    const result = updatePercentageWithRebalance(dests, "1", NaN);
    expect(totalPercentage(result)).toBe(100);
    result.forEach((d) => {
      expect(isNaN(d.percentage)).toBe(false);
      expect(d.percentage).toBeGreaterThanOrEqual(10);
    });
  });
});
