import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import MixingPage from "@/pages/MixingPage";

// Mock the Layout to avoid rendering Header/Footer nav
vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

// Mock the API module
vi.mock("@/lib/api", () => ({
  createMixSession: vi.fn(),
}));

import { createMixSession } from "@/lib/api";

const VALID_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const MOCK_SESSION = {
  data: {
    sessionId: "sess-abc-123",
    depositAddress: "tb1qmock0depositaddress0000000000000000000",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    status: "pending_deposit",
  },
  status: 200,
};

function renderPage() {
  return render(
    <BrowserRouter>
      <MixingPage />
    </BrowserRouter>
  );
}

describe("MixingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial render", () => {
    it("shows the configure step by default", () => {
      renderPage();
      expect(screen.getByText("Destination Addresses")).toBeInTheDocument();
    });

    it("shows the Review Configuration button disabled without a valid address", () => {
      renderPage();
      const btn = screen.getByRole("button", { name: /review configuration/i });
      expect(btn).toBeDisabled();
    });
  });

  describe("configure step", () => {
    it("enables Review Configuration after entering a valid address", () => {
      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });

      const btn = screen.getByRole("button", { name: /review configuration/i });
      expect(btn).not.toBeDisabled();
    });

    it("keeps Review Configuration disabled with an invalid address", () => {
      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: "invalid-address" } });

      const btn = screen.getByRole("button", { name: /review configuration/i });
      expect(btn).toBeDisabled();
    });

    it("shows invalid address error message for bad input", () => {
      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: "badaddress" } });

      expect(screen.getByText(/invalid bitcoin address format/i)).toBeInTheDocument();
    });

    it("shows the Add button to add destinations", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    });
  });

  describe("happy flow: configure → confirm → deposit", () => {
    it("advances to confirm step after clicking Review Configuration", () => {
      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));

      expect(screen.getByText("Operation Summary")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirm and generate address/i })).toBeInTheDocument();
    });

    it("shows deposit info after successful API confirmation", async () => {
      vi.mocked(createMixSession).mockResolvedValue(MOCK_SESSION);

      renderPage();
      // Configure
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));

      // Confirm
      fireEvent.click(screen.getByRole("button", { name: /confirm and generate address/i }));

      // Deposit
      await waitFor(() => {
        expect(screen.getByText("Operation Configured")).toBeInTheDocument();
      });
      expect(screen.getByText(MOCK_SESSION.data.depositAddress)).toBeInTheDocument();
    });

    it("resets to configure step when New Operation is clicked", async () => {
      vi.mocked(createMixSession).mockResolvedValue(MOCK_SESSION);

      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm and generate address/i }));

      await waitFor(() => {
        expect(screen.getByText("Operation Configured")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /new operation/i }));
      expect(screen.getByText("Destination Addresses")).toBeInTheDocument();
    });
  });

  describe("API error handling", () => {
    it("shows 429 rate-limit message on the confirm step", async () => {
      vi.mocked(createMixSession).mockResolvedValue({
        error: { code: "RATE_LIMITED", message: "Rate limited" },
        status: 429,
      });

      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm and generate address/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it("shows generic API error message", async () => {
      vi.mocked(createMixSession).mockResolvedValue({
        error: { code: "SERVER_ERROR", message: "Something went wrong on our end" },
        status: 500,
      });

      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm and generate address/i }));

      await waitFor(() => {
        expect(screen.getByText("Something went wrong on our end")).toBeInTheDocument();
      });
    });

    it("dismisses the error on the Dismiss button click", async () => {
      vi.mocked(createMixSession).mockResolvedValue({
        error: { code: "SERVER_ERROR", message: "Dismiss this error" },
        status: 500,
      });

      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm and generate address/i }));

      await waitFor(() => {
        expect(screen.getByText("Dismiss this error")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
      expect(screen.queryByText("Dismiss this error")).not.toBeInTheDocument();
    });
  });

  describe("Back navigation", () => {
    it("returns to configure step when Back is clicked on the confirm step", () => {
      renderPage();
      const input = screen.getByPlaceholderText(/bc1q\.\.\. or 3\.\.\. or 1\.\.\./i);
      fireEvent.change(input, { target: { value: VALID_ADDRESS } });
      fireEvent.click(screen.getByRole("button", { name: /review configuration/i }));

      expect(screen.getByText("Operation Summary")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(screen.getByText("Destination Addresses")).toBeInTheDocument();
    });
  });
});
