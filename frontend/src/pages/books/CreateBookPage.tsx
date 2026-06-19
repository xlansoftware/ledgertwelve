// ---------------------------------------------------------------------------
// CreateBookPage — form to create a new book
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldContent, FieldError } from "@/components/ui/field"
import { useBooksStore } from "@/store"
import { toast } from "sonner"

export default function CreateBookPage() {
  const navigate = useNavigate()
  const createBook = useBooksStore((s) => s.createBook)

  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)

    // Client-side validation
    if (!name.trim()) {
      setNameError("Name is required")
      return
    }
    setNameError(null)

    setIsSubmitting(true)
    try {
      await createBook({
        name: name.trim(),
        currency: currency.trim() || undefined,
      })
      toast.success("Book created")
      navigate("/books")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create book"
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Create Book</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name field */}
        <Field>
          <FieldLabel htmlFor="book-name">Name</FieldLabel>
          <FieldContent>
            <Input
              id="book-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
              }}
              placeholder="My book"
              aria-label="Book name"
              aria-invalid={!!nameError}
            />
            {nameError && <FieldError>{nameError}</FieldError>}
          </FieldContent>
        </Field>

        {/* Currency field */}
        <Field>
          <FieldLabel htmlFor="book-currency">Currency</FieldLabel>
          <FieldContent>
            <Input
              id="book-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Optional. You can type any ISO currency code.
            </p>
          </FieldContent>
        </Field>

        {/* API error */}
        {apiError && (
          <FieldError>{apiError}</FieldError>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/books")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}