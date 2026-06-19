// ---------------------------------------------------------------------------
// FilterDialog — transaction filter dialog / bottom sheet
// Desktop: shadcn Dialog (centered modal)
// Mobile: shadcn Sheet with side="bottom" (bottom sheet)
// ---------------------------------------------------------------------------

import { useMediaQuery } from "@/hooks/use-media-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Filter from "./Filter"
import type { CategoryDto, FilterRequest } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CategoryDto[]
  users: string[]
  filter: FilterRequest
  onApply: (filter: FilterRequest) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FilterDialog({
  open,
  onOpenChange,
  categories,
  users,
  filter,
  onApply,
}: FilterDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  const handleApply = (appliedFilter: FilterRequest) => {
    onApply(appliedFilter)
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const content = (
    <Filter
      categories={categories}
      users={users}
      filter={filter}
      onApply={handleApply}
      onClose={handleClose}
    />
  )

  // --- Mobile: Sheet (bottom sheet) ---
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Filter Transactions</SheetTitle>
          </SheetHeader>
          <div className="px-0 pb-8 pt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // --- Desktop: Dialog (centered modal) ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Transactions</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}