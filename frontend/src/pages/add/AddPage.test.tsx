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

    // Wait for the categories to load (the MSW handler returns Groceries and Pets)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Category Groceries" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Category Pets" })).toBeInTheDocument();
  });

  it("renders categories in sort order", async () => {
    render(<AddPage />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Category Groceries" })).toBeInTheDocument();
    });

    // Verify categories are rendered
    const categoryButtons = screen.getAllByRole("button").filter((btn) =>
      btn.getAttribute("aria-label")?.startsWith("Category "),
    );

    // Groceries has order 1, Pets has order 2
    expect(categoryButtons[0]).toHaveAttribute("aria-label", "Category Groceries");
    expect(categoryButtons[1]).toHaveAttribute("aria-label", "Category Pets");
  });
});