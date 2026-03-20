import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Contact from "@/pages/Contact";

// Mock the Layout to avoid rendering Header/Footer nav
vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock the API module
vi.mock("@/lib/api", () => ({
  createContactTicket: vi.fn(),
}));

import { createContactTicket } from "@/lib/api";

const VALID_FORM = {
  subject: "Help with my transaction",
  message: "I sent Bitcoin but it has not arrived yet. Can you help me?",
  replyContact: "user@example.com",
};

function renderPage() {
  return render(
    <BrowserRouter>
      <Contact />
    </BrowserRouter>
  );
}

describe("Contact page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial render", () => {
    it("shows the contact form", () => {
      renderPage();
      expect(screen.getByRole("heading", { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });

    it("shows the Send Message button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    });
  });

  describe("happy flow: fill form and submit", () => {
    it("shows the ticket ID after successful submission", async () => {
      vi.mocked(createContactTicket).mockResolvedValue({
        data: { ticketId: "TKT-ABC123", createdAt: new Date().toISOString() },
        status: 200,
      });

      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: VALID_FORM.subject },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: VALID_FORM.message },
      });
      fireEvent.change(screen.getByLabelText(/reply contact/i), {
        target: { value: VALID_FORM.replyContact },
      });

      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText("TKT-ABC123")).toBeInTheDocument();
      });
      expect(screen.getByText(/message sent/i)).toBeInTheDocument();
    });

    it("passes the correct data to createContactTicket", async () => {
      vi.mocked(createContactTicket).mockResolvedValue({
        data: { ticketId: "TKT-XYZ789", createdAt: new Date().toISOString() },
        status: 200,
      });

      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: VALID_FORM.subject },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: VALID_FORM.message },
      });

      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(createContactTicket).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: VALID_FORM.subject,
            message: VALID_FORM.message,
          })
        );
      });
    });

    it("shows Send new message button after success and resets form on click", async () => {
      vi.mocked(createContactTicket).mockResolvedValue({
        data: { ticketId: "TKT-RESET1", createdAt: new Date().toISOString() },
        status: 200,
      });

      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: VALID_FORM.subject },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: VALID_FORM.message },
      });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText("TKT-RESET1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /send new message/i }));
      expect(screen.getByRole("heading", { name: /send message/i })).toBeInTheDocument();
    });
  });

  describe("validation errors block submission", () => {
    it("shows subject error when subject is too short", async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: "ab" },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: VALID_FORM.message },
      });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/subject must be at least/i)).toBeInTheDocument();
      });
      expect(createContactTicket).not.toHaveBeenCalled();
    });

    it("shows message error when message is too short", async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: VALID_FORM.subject },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: "Short" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/message must be at least/i)).toBeInTheDocument();
      });
      expect(createContactTicket).not.toHaveBeenCalled();
    });

    it("does not submit when subject and message are both empty", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/subject must be at least/i)).toBeInTheDocument();
      });
      expect(createContactTicket).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    it("shows 429 rate-limit message", async () => {
      vi.mocked(createContactTicket).mockResolvedValue({
        error: { code: "RATE_LIMITED", message: "Rate limited" },
        status: 429,
      });

      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: VALID_FORM.subject },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: VALID_FORM.message },
      });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it("shows generic API error message", async () => {
      vi.mocked(createContactTicket).mockResolvedValue({
        error: { code: "SERVER_ERROR", message: "Service unavailable" },
        status: 503,
      });

      renderPage();
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: VALID_FORM.subject },
      });
      fireEvent.change(screen.getByLabelText(/message/i), {
        target: { value: VALID_FORM.message },
      });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText("Service unavailable")).toBeInTheDocument();
      });
    });
  });
});
