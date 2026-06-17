import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getIcon } from "@/lib/getIcon";
import { cn, invertColor } from "@/lib/utils";
import { useCategoriesStore } from "@/store";
import type { CategoryDto } from "@/types";

type CategoryPickerProps = {
  selectedId?: string;
  onSelect: (category: CategoryDto) => void;
};

export default function CategoryPicker({ selectedId, onSelect }: CategoryPickerProps) {
  const categories = useCategoriesStore((s) => s.categories);
  const isLoading = useCategoriesStore((s) => s.isLoading);
  const error = useCategoriesStore((s) => s.error);
  const fetchCategories = useCategoriesStore((s) => s.fetchCategories);

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  // Loading state — show skeleton grid
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-stretch p-0 overflow-hidden rounded-md border border-input">
            <Skeleton className="min-w-4 w-10 h-10 rounded-none" />
            <div className="flex items-center px-3 py-2 w-full">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center text-sm text-destructive py-6">
        Failed to load categories.{" "}
        <button
          onClick={() => fetchCategories()}
          className="underline underline-offset-2 hover:text-destructive/80"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((category) => {
          const Icon = getIcon(category.icon);
          const isSelected = selectedId === category.id;
          const color = category.color ?? "#6b7280"; // default: gray-500

          return (
            <Button
              aria-label={`Category ${category.name}`}
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              onClick={() => onSelect(category)}
              className="flex items-stretch p-0 overflow-hidden"
            >
              <div
                className={cn("min-w-4 flex-shrink-0 flex items-center justify-center p-2", isSelected && "border-l border-t border-b border-primary")}
                style={{
                  backgroundColor: color,
                  color: invertColor(color),
                }}
              >
                <Icon className="flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 px-0 py-2 text-left w-full overflow-hidden">
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis block">
                  {category.name}
                </span>
              </div>
            </Button>
          );
        })}
    </div>
  );
}