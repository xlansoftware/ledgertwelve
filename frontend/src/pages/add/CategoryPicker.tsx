import { Button } from "@/components/ui/button";
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
                className={cn("min-w-4 flex-shrink-0 flex items-center justify-center p-2", isSelected && "border-l border-t border-b border-primary rounded-l-md")}
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