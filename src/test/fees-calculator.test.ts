import { describe, it, expect } from "vitest";
import { SERVICE_CONFIG } from "@/lib/constants";

describe("Fees Calculator Logic", () => {
  const calculate = (amount: number) => {
    const clamped = Math.max(0, amount);
    const serviceFee = clamped * SERVICE_CONFIG.serviceFeePercentage;
    const total = serviceFee + SERVICE_CONFIG.networkFeeEstimate;
    const output = Math.max(0, clamped - total);
    return { serviceFee, total, output };
  };

  it("calculates correctly for 0.1 BTC", () => {
    const { serviceFee, output } = calculate(0.1);
    expect(serviceFee).toBeCloseTo(0.0015, 8);
    expect(output).toBeCloseTo(0.1 - 0.0015 - SERVICE_CONFIG.networkFeeEstimate, 8);
  });

  it("handles zero amount", () => {
    const { serviceFee, output } = calculate(0);
    expect(serviceFee).toBe(0);
    expect(output).toBe(0);
  });

  it("handles negative amount as zero", () => {
    const { output } = calculate(-5);
    expect(output).toBe(0);
  });

  it("uses centralized config values", () => {
    expect(SERVICE_CONFIG.serviceFeePercentage).toBe(0.015);
    expect(SERVICE_CONFIG.networkFeeEstimate).toBe(0.00015);
  });

  it("output never goes negative", () => {
    // Very small amount where fees exceed input
    const { output } = calculate(0.00001);
    expect(output).toBe(0);
  });
});
