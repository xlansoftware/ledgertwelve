import { cn } from "@/lib/utils"
import type { Category } from "@/types/models"

// ---------------------------------------------------------------------------
// CategoryButton
// ---------------------------------------------------------------------------

interface CategoryButtonProps {
  category: Category
  isSelected: boolean
  onSelect: (categoryId: string) => void
}

function CategoryButton({ category, isSelected, onSelect }: CategoryButtonProps) {
  const initial = category.name.charAt(0).toUpperCase()
  const bgColor = category.color ?? "#6366f1"

  return (
    <button
      type="button"
      role="button"
      aria-pressed={isSelected}
      aria-label={category.name}
      onClick={() => onSelect(category.id)}
      className={cn(
        "flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-all",
        isSelected
          ? "bg-foreground text-primary-foreground font-semibold ring-2 ring-primary"
          : "bg-card text-foreground font-normal ring-1 ring-border hover:bg-muted/50",
      )}
    >
      {/* Icon circle with first letter */}
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isSelected
            ? "bg-primary/20 text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
        style={{
          backgroundColor: isSelected ? undefined : `${bgColor}20`,
          color: isSelected ? undefined : bgColor,
        }}
      >
        {initial}
      </span>

      {/* Category name */}
      <span className="truncate">{category.name}</span>
    </button>
  )
}

export { CategoryButton }
export type { CategoryButtonProps }
