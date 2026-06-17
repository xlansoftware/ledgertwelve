// ---------------------------------------------------------------------------
// Component tests — AddPage
// ---------------------------------------------------------------------------

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AddPage from "./AddPage";

describe("AddPage", () => {
  it("renders the amount input, notes input, and add button", () => {
    render(<AddPage />);

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("loads and displays categories", async () => {
    render(<AddPage />);

    // The notes input is present from the start
    expect(screen.getByPlaceholderText("Notes ...")).toBeInTheDocument();

    // Wait for the categories to load (the MSW handler returns Food and Rent)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Category Food" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Category Rent" })).toBeInTheDocument();
  });

  it("renders categories in sort order", async () => {
    render(<AddPage />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Category Food" })).toBeInTheDocument();
    });

    // Verify both categories are rendered
    const categoryButtons = screen.getAllByRole("button").filter((btn) =>
      btn.getAttribute("aria-label")?.startsWith("Category "),
    );

    // Food has order 1, Rent has order 2
    expect(categoryButtons[0]).toHaveAttribute("aria-label", "Category Food");
    expect(categoryButtons[1]).toHaveAttribute("aria-label", "Category Rent");
  });
});