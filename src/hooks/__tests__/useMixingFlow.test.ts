import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useMixingFlow } from "@/hooks/useMixingFlow";

vi.mock("@/lib/api", () => ({
  createMixSession: vi.fn(),
}));

import { createMixSession } from "@/lib/api";

const VALID_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const MOCK_SESSION_RESPONSE = {
  data: {
    sessionId: "test-session-123",
    depositAddress: "tb1qabc123testaddress",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    status: "pending_deposit",
  },
  status: 200,
};

describe("useMixingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts on configure step", () => {
      const { result } = renderHook(() => useMixingFlow());
      expect(result.current.step).toBe("configure");
    });

    it("starts with one destination at 100%", () => {
      const { result } = renderHook(() => useMixingFlow());
      expect(result.current.destinations).toHaveLength(1);
      expect(result.current.destinations[0].percentage).toBe(100);
      expect(result.current.destinations[0].address).toBe("");
    });

    it("starts with no session and no error", () => {
      const { result } = renderHook(() => useMixingFlow());
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("canProceed is false with empty address", () => {
      const { result } = renderHook(() => useMixingFlow());
      expect(result.current.canProceed).toBe(false);
    });
  });

  describe("address and percentage updates", () => {
    it("canProceed becomes true with a valid address and 100% total", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.updateAddress("1", VALID_ADDRESS);
      });
      expect(result.current.canProceed).toBe(true);
    });

    it("canProceed is false with an invalid address", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.updateAddress("1", "invalid-address");
      });
      expect(result.current.canProceed).toBe(false);
    });

    it("updatePercentage changes the percentage for the given destination", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.addDestination();
      });
      const id = result.current.destinations[0].id;
      act(() => {
        result.current.updatePercentage(id, 70);
      });
      const dest = result.current.destinations.find((d) => d.id === id);
      expect(dest?.percentage).toBe(70);
    });
  });

  describe("destination distribution", () => {
    it("adding a destination redistributes percentages to sum to 100", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.addDestination();
      });
      expect(result.current.destinations).toHaveLength(2);
      expect(result.current.totalPercentage).toBe(100);
    });

    it("adding destinations up to max 5 redistributes correctly", () => {
      const { result } = renderHook(() => useMixingFlow());
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.addDestination();
        });
      }
      expect(result.current.destinations).toHaveLength(5);
      expect(result.current.totalPercentage).toBe(100);
    });

    it("does not add beyond max destinations", () => {
      const { result } = renderHook(() => useMixingFlow());
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.addDestination();
        });
      }
      expect(result.current.destinations.length).toBeLessThanOrEqual(5);
    });

    it("removing a destination redistributes percentages to sum to 100", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.addDestination();
      });
      const idToRemove = result.current.destinations[0].id;
      act(() => {
        result.current.removeDestination(idToRemove);
      });
      expect(result.current.destinations).toHaveLength(1);
      expect(result.current.totalPercentage).toBe(100);
    });

    it("does not remove the last remaining destination", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.removeDestination("1");
      });
      expect(result.current.destinations).toHaveLength(1);
    });
  });

  describe("step transitions", () => {
    it("setStep changes the current step", () => {
      const { result } = renderHook(() => useMixingFlow());
      act(() => {
        result.current.setStep("confirm");
      });
      expect(result.current.step).toBe("confirm");
    });
  });

  describe("handleConfirm", () => {
    it("transitions to deposit step on success", async () => {
      vi.mocked(createMixSession).mockResolvedValue(MOCK_SESSION_RESPONSE);
      const { result } = renderHook(() => useMixingFlow());

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(result.current.step).toBe("deposit");
      expect(result.current.session?.sessionId).toBe("test-session-123");
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("sets rate-limit error on 429 response", async () => {
      vi.mocked(createMixSession).mockResolvedValue({
        error: { code: "RATE_LIMITED", message: "Rate limited" },
        status: 429,
      });
      const { result } = renderHook(() => useMixingFlow());

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(result.current.error).toBe("Too many requests. Please wait a few minutes.");
      expect(result.current.step).toBe("configure");
      expect(result.current.loading).toBe(false);
    });

    it("sets generic error message on non-429 API failure", async () => {
      vi.mocked(createMixSession).mockResolvedValue({
        error: { code: "SERVER_ERROR", message: "Internal server error" },
        status: 500,
      });
      const { result } = renderHook(() => useMixingFlow());

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(result.current.error).toBe("Internal server error");
      expect(result.current.step).toBe("configure");
    });
  });

  describe("handleNewOperation (reset)", () => {
    it("resets all state to initial values", async () => {
      vi.mocked(createMixSession).mockResolvedValue(MOCK_SESSION_RESPONSE);
      const { result } = renderHook(() => useMixingFlow());

      // Progress to deposit
      act(() => {
        result.current.updateAddress("1", VALID_ADDRESS);
      });
      await act(async () => {
        await result.current.handleConfirm();
      });
      expect(result.current.step).toBe("deposit");

      // Reset
      act(() => {
        result.current.handleNewOperation();
      });

      expect(result.current.step).toBe("configure");
      expect(result.current.destinations).toHaveLength(1);
      expect(result.current.destinations[0].address).toBe("");
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
