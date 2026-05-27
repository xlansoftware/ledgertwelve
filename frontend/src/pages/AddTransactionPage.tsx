import { useEffect, useState, useCallback } from "react"
import { AmountInput, parseAmount } from "@/components/AmountInput"
import { CategorySelector } from "@/components/Category/CategorySelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCategoryStore } from "@/store/categoryStore"
import { useTransactionStore } from "@/store/transactionStore"
import { useUserStore } from "@/store/userStore"
import type { CreateTransactionRequest } from "@/types/api.types"

export default function AddTransactionPage() {
  // -----------------------------------------------------------------------
  // Stores
  // -----------------------------------------------------------------------

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    fetchCategories,
  } = useCategoryStore()

  const { addTransaction } = useTransactionStore()
  const user = useUserStore((s) => s.user)

  // -----------------------------------------------------------------------
  // Local form state
  // -----------------------------------------------------------------------

  const [amountRaw, setAmountRaw] = useState("")
  const [parsedAmount, setParsedAmount] = useState<number | null>(null)
  const [parsedCurrency, setParsedCurrency] = useState<string | undefined>(
    undefined,
  )
  const [notes, setNotes] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleAmountParsed = useCallback(
    (result: { raw: string; amount: number | null; currency?: string }) => {
      if (!result.raw) {
        setParsedAmount(null)
        setParsedCurrency(undefined)
        return
      }
      // Re-parse to get fresh values
      const parsed = parseAmount(result.raw)
      setParsedAmount(parsed.amount)
      setParsedCurrency(parsed.currency)
    },
    [],
  )

  const handleAmountChange = useCallback((value: string) => {
    setAmountRaw(value)
  }, [])

  const handleSubmit = async () => {
    // 1. Validate
    if (parsedAmount === null) {
      setSubmitError("Please enter a valid amount.")
      return
    }
    if (!selectedCategoryId) {
      setSubmitError("Please select a category.")
      return
    }

    // 2. Build payload
    const category = categories.find((c) => c.id === selectedCategoryId)
    if (!category) return

    const payload: CreateTransactionRequest = {
      value: parsedAmount,
      currency: parsedCurrency || "",
      category: category.name, // <— category name, not ID
      author: user ?? undefined,
      notes: notes || undefined,
    }

    // 3. Submit
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await addTransaction(payload)

      // Check if store caught an error
      const error = useTransactionStore.getState().error;
      if (error) {
        setSubmitError("Failed to save transaction. Please try again.")
        setIsSubmitting(false)
        return
      }

      // 4. Reset on success
      setAmountRaw("")
      setParsedAmount(null)
      setParsedCurrency(undefined)
      setNotes("")
      setSelectedCategoryId(undefined)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex flex-col gap-6">
        {/* Amount + Submit row */}
        <div className="flex items-end gap-3">
          <AmountInput
            value={amountRaw}
            onChange={handleAmountChange}
            onParsed={handleAmountParsed}
            autoFocus
            className="flex-1"
          />
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mb-1 shrink-0"
          >
            {isSubmitting ? "Saving…" : "Add"}
          </Button>
        </div>

        {/* Notes */}
        <div>
          <Input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">
            Category
          </span>

          {categoriesLoading && (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">
                Loading categories…
              </span>
            </div>
          )}

          {categoriesError && !categoriesLoading && (
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-sm text-destructive">{categoriesError}</p>
              <Button variant="outline" size="sm" onClick={fetchCategories}>
                Retry
              </Button>
            </div>
          )}

          {!categoriesLoading && !categoriesError && (
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {submitError}
          </p>
        )}
      </div>
    </div>
  )
}
