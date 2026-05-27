import type { Category } from "@/types/models"
import { CategoryButton } from "./CategoryButton"

// ---------------------------------------------------------------------------
// CategorySelector
// ---------------------------------------------------------------------------

interface CategorySelectorProps {
  categories: Category[]
  selectedCategoryId?: string
  onSelect: (categoryId: string) => void
}

function CategorySelector({
  categories,
  selectedCategoryId,
  onSelect,
}: CategorySelectorProps) {
  const handleSelect = (categoryId: string) => {
    onSelect(categoryId)
  }

  // Sort by displayOrder ascending, then by name alphabetically
  const sorted = [...categories].sort((a, b) => {
    const orderA = a.displayOrder ?? Infinity
    const orderB = b.displayOrder ?? Infinity
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="grid grid-cols-2 gap-3">
      {sorted.map((cat) => (
        <CategoryButton
          key={cat.id}
          category={cat}
          isSelected={cat.id === selectedCategoryId}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
}

export { CategorySelector }
export type { CategorySelectorProps }
