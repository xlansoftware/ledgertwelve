// ---------------------------------------------------------------------------
// Component tests — YearList
// ---------------------------------------------------------------------------

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest"
import { YearList } from "./YearList"

// ---------------------------------------------------------------------------
// Setup (fake clock so "current year" is deterministic)
// ---------------------------------------------------------------------------

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-07-15"))
})

afterAll(() => {
  vi.useRealTimers()
})

const YEAR_NETS = {
  "2024": -3000,
  "2025": 2000,
  "2026": -1500,
}

function renderYearList(overrides: Partial<Parameters<typeof YearList>[0]> = {}) {
  const props = {
    years: ["2024", "2025", "2026"],
    yearNets: YEAR_NETS,
    selectedYear: null,
    isLoadingYears: false,
    yearsError: null,
    onSelectYear: vi.fn(),
    ...overrides,
  }
  return {
    onSelectYear: props.onSelectYear,
    ...render(<YearList {...props} />),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("YearList", () => {
  it("renders a 'Yearly Net' list with each year and its net amount", () => {
    renderYearList()

    expect(screen.getByText("Yearly Net")).toBeInTheDocument()

    // formatExpense(-3000) → "3,000.00" (expense shown positive)
    // formatExpense(2000) → "-2,000.00" (income shown negative)
    expect(screen.getByText("2026")).toBeInTheDocument()
    expect(screen.getByText("3,000.00")).toBeInTheDocument()
    expect(screen.getByText("2025")).toBeInTheDocument()
    expect(screen.getByText("-2,000.00")).toBeInTheDocument()
    expect(screen.getByText("2024")).toBeInTheDocument()
  })

  it("orders years newest-first", () => {
    renderYearList()

    const buttons = screen.getAllByRole("button")
    const labels = buttons.map((b) => b.textContent?.trim() ?? "")
    // First token of each row label is the year
    expect(labels[0]).toContain("2026")
    expect(labels[1]).toContain("2025")
    expect(labels[2]).toContain("2024")
  })

  it("highlights the current year's row in the primary color", () => {
    renderYearList()

    const buttons = screen.getAllByRole("button")
    const currentYearButton = buttons.find((b) => b.textContent?.startsWith("2026"))
    const labelSpan = currentYearButton?.querySelector(".font-medium")

    expect(labelSpan?.className).toContain("text-primary")
    // Past years are not highlighted as current
    const pastYearButton = buttons.find((b) => b.textContent?.startsWith("2025"))
    expect(pastYearButton?.querySelector(".font-medium")?.className).not.toContain("text-primary")
  })

  it("marks the currently selected year as selected", () => {
    renderYearList({ selectedYear: "2024" })

    const buttons = screen.getAllByRole("button")
    const selectedButton = buttons.find((b) => b.textContent?.startsWith("2024"))
    expect(selectedButton?.className).toContain("border-primary")
  })

  it("calls onSelectYear(year) when a past year is clicked", () => {
    const { onSelectYear } = renderYearList()

    const buttons = screen.getAllByRole("button")
    const year2025Button = buttons.find((b) => b.textContent?.startsWith("2025"))
    fireEvent.click(year2025Button!)

    expect(onSelectYear).toHaveBeenCalledWith("2025")
  })

  it("calls onSelectYear(null) when the current year is clicked (back to default)", () => {
    const { onSelectYear } = renderYearList()

    const buttons = screen.getAllByRole("button")
    const currentYearButton = buttons.find((b) => b.textContent?.startsWith("2026"))
    fireEvent.click(currentYearButton!)

    expect(onSelectYear).toHaveBeenCalledWith(null)
  })

  it("shows a muted 'No transactions yet' message when there are no years", () => {
    renderYearList({ years: [], yearNets: {} })

    expect(screen.getByText("No transactions yet")).toBeInTheDocument()
    expect(screen.queryByText("Yearly Net")).not.toBeInTheDocument()
  })

  it("shows a loading skeleton while the year list is loading", () => {
    const { container } = renderYearList({ years: [], yearNets: {}, isLoadingYears: true })

    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument()
    expect(screen.queryByText("Yearly Net")).not.toBeInTheDocument()
    // Skeleton pulse rows are rendered
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("shows the error message when the year list fails to load", () => {
    renderYearList({ years: [], yearNets: {}, yearsError: "Failed to load years" })

    expect(screen.getByText("Failed to load years")).toBeInTheDocument()
    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument()
  })
})
