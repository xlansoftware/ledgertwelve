// ---------------------------------------------------------------------------
// CloseBookDialog — modal dialog for closing a book
// ---------------------------------------------------------------------------

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox"
import { useCategoriesStore } from "@/store"
import { closeBook } from "@/services"
import { toast } from "sonner"

export interface CloseBookDialogProps {
  bookId: string
  bookName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CloseBookDialog({
  bookId,
  bookName,
  open,
  onOpenChange,
  onSuccess,
}: CloseBookDialogProps) {
  const categories = useCategoriesStore((s) => s.categories)
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const [closingCategoryName, setClosingCategoryName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!closingCategoryName) return
    setIsSubmitting(true)
    setError(null)

    try {
      await closeBook(bookId, { closingCategoryName })
      toast.success(`Book "${bookName}" closed`)
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to close book"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close "{bookName}"</DialogTitle>
          <DialogDescription>
            Closing this book moves its net balance to the Main book via a
            balancing transaction. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="closing-category">Closing category</Label>
            <Combobox
              value={closingCategoryName}
              onValueChange={(value) => {
                setClosingCategoryName(value ?? "")
                if (error) setError(null)
              }}
            >
              <ComboboxInput
                id="closing-category"
                showTrigger
                placeholder="Select a category…"
                className="w-full"
              />
              <ComboboxContent className="w-full">
                <ComboboxList>
                  {sortedCategories.map((cat) => (
                    <ComboboxItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {error && (
            <p className="text-sm text-destructive" data-testid="close-error">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!closingCategoryName || isSubmitting}
          >
            {isSubmitting ? "Closing…" : "Close book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}