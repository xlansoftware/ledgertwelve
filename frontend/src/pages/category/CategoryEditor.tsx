import { useEffect, useState } from "react";
import { type CategoryDto } from "@/types";
import { Input } from "@/components/ui/input";
import { ResponsiveIconPicker } from "@/components/common/responsive/ResponsiveIconPicker";
import { ResponsiveColorPicker } from "@/components/common/responsive/ResponsiveColorPicker";
import { useCategoriesStore } from "@/store";

interface Props {
  category: CategoryDto;
}

export default function CategoryEditor({ category }: Props) {
  const updateCategory = useCategoriesStore((s) => s.updateCategory)

  const [local, setLocal] = useState<CategoryDto>(category);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleChange = (field: keyof CategoryDto, value: unknown) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (timeoutId) clearTimeout(timeoutId);

    const id = setTimeout(() => {
      if (JSON.stringify(local) !== JSON.stringify(category)) {
        updateCategory(local.id, {
          name: local.name,
          color: local.color,
          icon: local.icon,
        });
      }
    }, 500);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeoutId(id);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="flex gap-2 items-center w-full">
      <Input
        className="flex-grow"
        value={local.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
      <ResponsiveColorPicker
        value={local.color || "#000000"}
        onChange={(newColor) => handleChange("color", newColor)}
        title="Choose a color"
      />
      <ResponsiveIconPicker
        value={local.icon || ""}
        onChange={(val) => handleChange("icon", val)}
        title="Pick an icon"
      />
    </div>
  );
}
