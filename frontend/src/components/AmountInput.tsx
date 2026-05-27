import { cn } from "@/lib/utils"
import * as React from "react"

// ---------------------------------------------------------------------------
// parseAmount — pure parse function (exported for direct testing)
// ---------------------------------------------------------------------------

function safeEval(expr: string): number | null {
  const sanitised = expr.trim()
  if (!sanitised) return null

  // Only allow digits, decimal points, operators, parentheses, spaces, and leading minus
  if (!/^[\d+\-*/().\s]+$/.test(sanitised)) return null

  try {
    const result = Function(`"use strict"; return (${sanitised})`)()
    if (typeof result !== 'number' || !Number.isFinite(result)) return null
    return Math.round(result * 100) / 100
  } catch {
    return null
  }
}

export function parseAmount(raw: string): {
  amount: number | null
  currency?: string
} {
  const trimmed = raw.trim()
  if (!trimmed) return { amount: null }

  let expression = trimmed
  let currency: string | undefined

  // 1. Try to extract currency suffix (with or without preceding space)
  // Order matters: try with-space first so "22 USD" matches correctly
  const suffixSpaceMatch = trimmed.match(/\s+([a-zA-Z]{3})$/) // "   Usd"
  if (suffixSpaceMatch) {
    currency = suffixSpaceMatch[1].toUpperCase()
    expression = trimmed.slice(0, suffixSpaceMatch.index).trimEnd()
  } else {
    const suffixNoSpaceMatch = trimmed.match(/([a-zA-Z]{3})$/) // "22usd"
    if (suffixNoSpaceMatch) {
      currency = suffixNoSpaceMatch[1].toUpperCase()
      expression = trimmed.slice(0, suffixNoSpaceMatch.index).trimEnd()
    }
  }

  // 2. Try to extract currency prefix (only if suffix wasn't found)
  if (!currency) {
    const prefixMatch = trimmed.match(/^([a-zA-Z]{3})\s*/)
    if (prefixMatch) {
      currency = prefixMatch[1].toUpperCase()
      expression = trimmed.slice(prefixMatch[0].length).trim()
    }
  }

  const amount = safeEval(expression)
  if (amount === null) return { amount: null }

  return { amount, currency }
}

// ---------------------------------------------------------------------------
// AmountInput component
// ---------------------------------------------------------------------------

export interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  onParsed?: (result: {
    raw: string
    amount: number | null
    currency?: string
  }) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

function AmountInput({
  value,
  onChange,
  onParsed,
  placeholder = "Amount (e.g. 12.50 + 3, 22 USD)",
  autoFocus = true,
  className,
}: AmountInputProps) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  // Notify parsed result whenever value changes
  React.useLayoutEffect(() => {
    if (!onParsed) return
    const { amount, currency } = parseAmount(value)
    onParsed({ raw: value, amount, currency })
  }, [value, onParsed])

  const parsed = value ? parseAmount(value) : { amount: null }
  const hasInvalidInput = value.length > 0 && parsed.amount === null

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={cn(
          "w-full rounded-lg border-0 bg-transparent py-3 text-3xl font-medium outline-none",
          "placeholder:text-muted-foreground/40",
          hasInvalidInput && "text-muted-foreground",
        )}
      />
      {/* Bottom border indicator */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px transition-colors",
          hasInvalidInput ? "bg-destructive/40" : "bg-border",
        )}
      />
    </div>
  )
}

export { AmountInput }
