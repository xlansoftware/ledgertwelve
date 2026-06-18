// ---------------------------------------------------------------------------
// ConvertDialog — currency conversion dialog / bottom sheet
// Desktop: shadcn Dialog (centered modal)
// Mobile: shadcn Sheet with side="bottom" (bottom sheet)
// ---------------------------------------------------------------------------

import { useMediaQuery } from "@/hooks/use-media-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { FieldGroup, Field, FieldLabel, FieldDescription, FieldError, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useConvertDialogState, type ConvertResult } from "./useConvertDialogState"
import { useCallback } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConvertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalAmount: number
  originalCurrency: string
  bookCurrency: string
  onConfirm: (result: ConvertResult) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConvertDialog({
  open,
  onOpenChange,
  originalAmount,
  originalCurrency,
  bookCurrency,
  onConfirm,
}: ConvertDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  const {
    rate,
    setRate,
    converted,
    setConverted,
    isLoading,
    error,
    isValid,
    getResult,
  } = useConvertDialogState({
    originalAmount,
    originalCurrency,
    bookCurrency,
    open,
  })

  const handleConfirm = useCallback(() => {
    if (!isValid) return
    onConfirm(getResult())
    onOpenChange(false)
  }, [isValid, onConfirm, getResult, onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && isValid) {
        e.preventDefault()
        handleConfirm()
      }
    },
    [isValid, handleConfirm],
  )

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // --- Rate label text (e.g., "1 USD = ___ EUR") ---
  const rateLabel = `1 ${originalCurrency} = ${bookCurrency}`

  // --- Content shared between Dialog and Sheet ---
  const content = (
    <div className="flex flex-col gap-6" onKeyDown={handleKeyDown}>
      <FieldGroup>
        {/* Original amount (read-only) */}
        <Field>
          <FieldLabel>Original Amount</FieldLabel>
          <FieldContent>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                disabled
                value={`${originalAmount} ${originalCurrency}`}
                aria-label="Original amount"
                className="opacity-60"
              />
              <span className="text-muted-foreground" aria-hidden>
                🔒
              </span>
            </div>
          </FieldContent>
        </Field>

        {/* Exchange rate (editable, auto-focused) */}
        <Field>
          <FieldLabel>{rateLabel}</FieldLabel>
          <FieldContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <Input
                  autoFocus
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.0000"
                  aria-label="Exchange rate"
                  inputMode="decimal"
                />
                {rate && (
                  <FieldDescription>
                    1 {originalCurrency} = {rate || "?"} {bookCurrency}
                  </FieldDescription>
                )}
              </>
            )}
            {error && (
              <FieldError>{error}</FieldError>
            )}
          </FieldContent>
        </Field>

        {/* Converted amount (editable) */}
        <Field>
          <FieldLabel>Amount in {bookCurrency}</FieldLabel>
          <FieldContent>
            <Input
              value={converted}
              onChange={(e) => setConverted(e.target.value)}
              placeholder="0.00"
              aria-label="Amount in book currency"
              inputMode="decimal"
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Footer actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid}>
          Confirm
        </Button>
      </div>
    </div>
  )

  // --- Mobile: Sheet (bottom sheet) ---
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Currency Conversion</SheetTitle>
          </SheetHeader>
          <div className="px-8 pb-8">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // --- Desktop: Dialog (centered modal) ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Currency Conversion</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}