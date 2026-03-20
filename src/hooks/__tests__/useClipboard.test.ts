import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useClipboard } from "@/hooks/useClipboard";

describe("useClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Provide a clean clipboard mock for each test
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(""),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with copied=false and error=null", () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns true and sets copied=true on successful copy", async () => {
    const { result } = renderHook(() => useClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy("hello world");
    });

    expect(success).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world");
  });

  it("resets copied to false after the default timeout (2000ms)", async () => {
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("text");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  it("respects a custom timeout option", async () => {
    const { result } = renderHook(() => useClipboard({ timeout: 500 }));

    await act(async () => {
      await result.current.copy("text");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  it("returns false and sets error when clipboard API is not available", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy("text");
    });

    expect(success).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toMatch(/not supported/i);
  });

  it("returns false and sets error when writeText throws", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy("text");
    });

    expect(success).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error?.message).toBe("Permission denied");
  });
});
