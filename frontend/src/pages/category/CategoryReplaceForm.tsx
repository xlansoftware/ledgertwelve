import { type CategoryDto } from "@/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCategoriesStore } from "@/store";

interface Props {
  category: CategoryDto;
  trigger: React.ReactNode;
  onConfirm: (replacementId: CategoryDto['id']) => void;
}

export default function CategoryReplaceDialog({
  category,
  trigger,
  onConfirm,
}: Props) {
  const categories = useCategoriesStore((s) => s.categories)
  const [open, setOpen] = useState(false);
  const [replacementId, setReplacementId] = useState<CategoryDto['id'] | null>(null);

  const otherCategories = categories.filter((c) => c.id !== category.id);

  const handleConfirm = () => {
    if (replacementId === null) {
      toast.error("Please select a replacement category");
      return;
    }

    onConfirm(replacementId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace & Delete Category</DialogTitle>
          <DialogDescription>
            You’re about to delete <strong>{category.name}</strong>. Select a category
            to reassign existing transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Select onValueChange={(val) => setReplacementId(String(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Select replacement category" />
            </SelectTrigger>
            <SelectContent className="max-h-[40vh] overflow-y-auto">
              {otherCategories.map((c) => (
                <SelectItem key={c.id} className="py-2 px-4" value={String(c.name)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={replacementId === null}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
