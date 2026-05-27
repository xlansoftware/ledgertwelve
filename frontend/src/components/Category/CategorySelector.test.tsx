import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import type { Category } from "@/types/models"
import { CategorySelector } from "./CategorySelector"

const categories: Category[] = [
  { id: "c1", name: "Groceries", color: "#22c55e", displayOrder: 1, icon: null },
  { id: "c2", name: "Transport", color: "#3b82f6", displayOrder: 2, icon: null },
  { id: "c3", name: "Dining", color: "#f59e0b", displayOrder: 3, icon: null },
]

describe("CategorySelector", () => {
  it("renders all categories as buttons", () => {
    render(
      <CategorySelector
        categories={categories}
        onSelect={() => {}}
      />,
    )

    expect(screen.getByRole("button", { name: /groceries/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /transport/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /dining/i })).toBeInTheDocument()
  })

  it("highlights selected category", () => {
    render(
      <CategorySelector
        categories={categories}
        selectedCategoryId="c2"
        onSelect={() => {}}
      />,
    )

    const transport = screen.getByRole("button", { name: /transport/i })
    expect(transport).toHaveAttribute("aria-pressed", "true")

    const groceries = screen.getByRole("button", { name: /groceries/i })
    expect(groceries).toHaveAttribute("aria-pressed", "false")
  })

  it("calls onSelect when a category is clicked", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <CategorySelector
        categories={categories}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole("button", { name: /dining/i }))
    expect(onSelect).toHaveBeenCalledWith("c3")
  })

  it("sorts categories by displayOrder then by name", () => {
    const unsorted: Category[] = [
      { id: "c5", name: "Dining", color: null, displayOrder: 4, icon: null },
      { id: "c6", name: "Arts", color: null, displayOrder: 2, icon: null },
      { id: "c7", name: "Bills", color: null, displayOrder: 2, icon: null },
      { id: "c8", name: "Rent", color: null, displayOrder: 1, icon: null },
    ]

    render(
      <CategorySelector
        categories={unsorted}
        onSelect={() => {}}
      />,
    )

    const buttons = screen.getAllByRole("button")
    // Rent (order 1), Arts (order 2), Bills (order 2), Dining (order 4)
    expect(buttons[0]).toHaveAttribute("aria-label", "Rent")
    expect(buttons[1]).toHaveAttribute("aria-label", "Arts")
    expect(buttons[2]).toHaveAttribute("aria-label", "Bills")
    expect(buttons[3]).toHaveAttribute("aria-label", "Dining")
  })
})