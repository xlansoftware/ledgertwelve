// ---------------------------------------------------------------------------
// useConvertDialogState — hook for currency conversion logic
// Independently testable, no DOM dependencies.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from "react"
import { getExchangeRate } from "@/services/ratesService"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConvertResult {
  amount: number
  originalAmount: number
  originalCurrency: string
  exchangeRate: number
}

export interface UseConvertDialogStateInput {
  originalAmount: number
  originalCurrency: string
  bookCurrency: string
  open: boolean
}

export interface UseConvertDialogStateOutput {
  /** The rate input field value (display string). */
  rate: string
  /** Setter for the rate field. Recalculates converted. */
  setRate: (value: string) => void
  /** The converted amount input field value (display string). */
  converted: string
  /** Setter for the converted field. Recalculates rate. */
  setConverted: (value: string) => void
  /** True while the rate API is in flight. */
  isLoading: boolean
  /** Error message from the rate API, or null. */
  error: string | null
  /** True when both fields are non-empty. */
  isValid: boolean
  /** Returns full-precision numeric values for the API. */
  getResult: () => ConvertResult
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to a given number of decimal places. */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Format a number to a given number of decimal places for display. */
function formatDisplay(value: number, decimals: number): string {
  return roundTo(value, decimals).toFixed(decimals)
}

// Characters allowed in rate input: digits and decimal point only
const RATE_ALLOWED = /^[\d.]*$/

// Characters allowed in converted input: digits, decimal point, and minus at start
const CONVERTED_ALLOWED = /^-?[\d.]*$/

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConvertDialogState(
  input: UseConvertDialogStateInput,
): UseConvertDialogStateOutput {
  const { originalAmount, originalCurrency, bookCurrency, open } = input

  const [rate, setRateState] = useState("")
  const [converted, setConvertedState] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep the latest originalAmount in a ref so callbacks don't stale
  const originalAmountRef = useRef(originalAmount)
  originalAmountRef.current = originalAmount

  // Keep the raw (full-precision) rate value for calculations
  const rawRateRef = useRef(0)

  // --- Fetch exchange rate when dialog opens ---
  useEffect(() => {
    if (!open) {
      setError(null)
      return
    }

    // Only fetch when currencies differ
    if (!originalCurrency || !bookCurrency || originalCurrency === bookCurrency) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)
    setRateState("")
    setConvertedState("")

    getExchangeRate({ from: originalCurrency, to: bookCurrency })
      .then((result) => {
        if (cancelled) return

        const fetchedRate = result.rate
        // Calculate the converted amount using the fetched rate
        const absOriginal = Math.abs(originalAmountRef.current)
        const convertedValue = absOriginal * fetchedRate
        // Preserve sign from original amount
        const signedConverted = originalAmountRef.current < 0 ? -convertedValue : convertedValue

        rawRateRef.current = fetchedRate

        setRateState(formatDisplay(fetchedRate, 4))
        setConvertedState(formatDisplay(signedConverted, 2))
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message || "Failed to fetch exchange rate")
        setIsLoading(false)
        // Leave fields empty for manual entry
        setRateState("")
        setConvertedState("")
      })

    return () => {
      cancelled = true
    }
  }, [open, originalCurrency, bookCurrency])

  // --- Set rate (recalculates converted) ---
  const setRate = useCallback(
    (value: string) => {
      // Only allow valid characters
      if (!RATE_ALLOWED.test(value)) return

      setRateState(value)

      if (value === "" || value === ".") {
        setConvertedState("")
        return
      }

      const parsedRate = parseFloat(value)
      if (isNaN(parsedRate) || parsedRate < 0) {
        setConvertedState("")
        return
      }

      rawRateRef.current = parsedRate

      const absOriginal = Math.abs(originalAmountRef.current)
      const convertedValue = absOriginal * parsedRate
      const signedConverted =
        originalAmountRef.current < 0 ? -convertedValue : convertedValue

      setConvertedState(formatDisplay(signedConverted, 2))
    },
    [],
  )

  // --- Set converted (recalculates rate) ---
  const setConverted = useCallback(
    (value: string) => {
      // Only allow valid characters
      if (!CONVERTED_ALLOWED.test(value)) return

      setConvertedState(value)

      if (value === "" || value === "." || value === "-" || value === "-.") {
        setRateState("")
        return
      }

      const parsedConverted = parseFloat(value)
      if (isNaN(parsedConverted)) {
        setRateState("")
        return
      }

      const absOriginal = Math.abs(originalAmountRef.current)
      if (absOriginal === 0) {
        // If original amount is 0, rate = 0
        rawRateRef.current = 0
        setRateState(formatDisplay(0, 4))
        return
      }

      // Rate = |converted| / |originalAmount| (always positive)
      const absConverted = Math.abs(parsedConverted)
      const calculatedRate = absConverted / absOriginal

      rawRateRef.current = calculatedRate
      setRateState(formatDisplay(calculatedRate, 4))
    },
    [],
  )

  // --- Validation ---
  const isValid =
    rate !== "" && rate !== "." && converted !== "" && converted !== "." && converted !== "-" && converted !== "-."

  // --- Get result (full precision) ---
  const getResult = useCallback((): ConvertResult => {
    const parsedRate = rate !== "" ? parseFloat(rate) : 0
    const parsedConverted = converted !== "" ? parseFloat(converted) : 0

    // Amount in book currency is the signed converted value
    return {
      amount: isNaN(parsedConverted) ? 0 : parsedConverted,
      originalAmount: originalAmountRef.current,
      originalCurrency,
      exchangeRate: isNaN(parsedRate) ? 0 : parsedRate,
    }
  }, [rate, converted, originalCurrency])

  return {
    rate,
    setRate,
    converted,
    setConverted,
    isLoading,
    error,
    isValid,
    getResult,
  }
}