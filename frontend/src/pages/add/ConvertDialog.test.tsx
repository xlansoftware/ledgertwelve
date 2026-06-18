// ---------------------------------------------------------------------------
// Integration tests — ConvertDialog
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import ConvertDialog from "./ConvertDialog"
import type { ConvertResult } from "./useConvertDialogState"
import { getExchangeRate } from "@/services/ratesService"

// Mock the rates service
vi.mock("@/services/ratesService", () => ({
  getExchangeRate: vi.fn(),
}))

const mockGetExchangeRate = vi.mocked(getExchangeRate)

// Mock useMediaQuery
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}))

import { useMediaQuery } from "@/hooks/use-media-query"
const mockUseMediaQuery = vi.mocked(useMediaQuery)

describe("ConvertDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    originalAmount: 110,
    originalCurrency: "USD",
    bookCurrency: "EUR",
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMediaQuery.mockReturnValue(false) // Desktop by default
    mockGetExchangeRate.mockResolvedValue({
      from: "USD",
      to: "EUR",
      rate: 0.91,
    })
  })

  it("renders with pre-filled rate and converted amount when API responds", async () => {
    render(<ConvertDialog {...defaultProps} />)

    // Wait for the rate to be fetched
    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    // Original amount should be shown
    expect(screen.getByDisplayValue("110 USD")).toBeInTheDocument()

    // Converted amount should be shown
    expect(screen.getByDisplayValue("100.10")).toBeInTheDocument()

    // Dialog title
    expect(screen.getByText("Currency Conversion")).toBeInTheDocument()
  })

  it("shows loading skeleton while fetching", () => {
    // Never resolve
    mockGetExchangeRate.mockReturnValue(new Promise(() => {}))

    render(<ConvertDialog {...defaultProps} />)

    // Skeleton should be present (the rate field is replaced with skeleton)
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it("shows error message when API fails", async () => {
    mockGetExchangeRate.mockRejectedValue(new Error("Failed to fetch rate"))

    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch rate")).toBeInTheDocument()
    })
  })

  it("allows editing the rate field and recalculates converted", async () => {
    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    const rateInput = screen.getByLabelText("Exchange rate")
    fireEvent.change(rateInput, { target: { value: "0.50" } })

    // 110 * 0.50 = 55.00
    await waitFor(() => {
      expect(screen.getByDisplayValue("55.00")).toBeInTheDocument()
    })
  })

  it("allows editing the converted field and recalculates rate", async () => {
    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    const convertedInput = screen.getByLabelText("Amount in book currency")
    fireEvent.change(convertedInput, { target: { value: "50" } })

    // rate = 50 / 110 ≈ 0.4545
    await waitFor(() => {
      expect(screen.getByDisplayValue("0.4545")).toBeInTheDocument()
    })
  })

  it("disables Confirm button when rate is cleared", async () => {
    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole("button", { name: "Confirm" })
    expect(confirmBtn).not.toBeDisabled()

    const rateInput = screen.getByLabelText("Exchange rate")
    fireEvent.change(rateInput, { target: { value: "" } })

    expect(confirmBtn).toBeDisabled()
  })

  it("disables Confirm button when converted is cleared", async () => {
    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    const convertedInput = screen.getByLabelText("Amount in book currency")
    fireEvent.change(convertedInput, { target: { value: "" } })

    const confirmBtn = screen.getByRole("button", { name: "Confirm" })
    expect(confirmBtn).toBeDisabled()
  })

  it("calls onConfirm with correct values", async () => {
    const onConfirm = vi.fn()

    render(<ConvertDialog {...defaultProps} onConfirm={onConfirm} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole("button", { name: "Confirm" })
    fireEvent.click(confirmBtn)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    const result: ConvertResult = onConfirm.mock.calls[0][0]
    expect(result.originalAmount).toBe(110)
    expect(result.originalCurrency).toBe("USD")
    expect(result.exchangeRate).toBe(0.91)
    // 110 * 0.91 = 100.1 → this is the full-precision amount
    expect(result.amount).toBeCloseTo(100.1)
  })

  it("calls onOpenChange(false) on Cancel", async () => {
    const onOpenChange = vi.fn()

    render(<ConvertDialog {...defaultProps} onOpenChange={onOpenChange} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    const cancelBtn = screen.getByRole("button", { name: "Cancel" })
    fireEvent.click(cancelBtn)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("confirms on Enter key", async () => {
    const onConfirm = vi.fn()

    render(<ConvertDialog {...defaultProps} onConfirm={onConfirm} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
    })

    // Press Enter in the rate field
    const rateInput = screen.getByLabelText("Exchange rate")
    fireEvent.keyDown(rateInput, { key: "Enter", code: "Enter" })

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("renders as Sheet on mobile", async () => {
    mockUseMediaQuery.mockReturnValue(true) // Mobile

    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      // On mobile, it should render as a Sheet with side="bottom"
      const sheetContent = document.querySelector('[data-slot="sheet-content"]')
      expect(sheetContent).toBeInTheDocument()
      expect(sheetContent).toHaveAttribute("data-side", "bottom")
    })
  })

  it("renders as Dialog on desktop", async () => {
    mockUseMediaQuery.mockReturnValue(false) // Desktop

    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument()
    })
  })

  it("shows original amount field as read-only and disabled", async () => {
    render(<ConvertDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("110 USD")).toBeInTheDocument()
    })

    const originalInput = screen.getByLabelText("Original amount")
    expect(originalInput).toHaveAttribute("readonly")
    expect(originalInput).toBeDisabled()
  })

  it("shows the rate label", async () => {
    render(<ConvertDialog {...defaultProps} />)

    // The label should show "1 USD = EUR"
    expect(screen.getByText("1 USD = EUR")).toBeInTheDocument()
  })
})