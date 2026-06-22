"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2Icon, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useCategoriesStore } from "@/store";
import type { CategoryDto } from "@/types";
import CategoryEditor from "./CategoryEditor";
import CategoryReplaceDialog from "./CategoryReplaceForm";

export default function CategoriesPage() {
  const categories = useCategoriesStore((s) => s.categories)
  const createCategory = useCategoriesStore((s) => s.createCategory)
  const deleteCategory = useCategoriesStore((s) => s.deleteCategory)
  const reassignCategories = useCategoriesStore((s) => s.reassignCategories)
  const reorderCategories = useCategoriesStore((s) => s.reorderCategories)

  const [order, setOrder] = useState<number[]>([]);
  const [beforeOrder, setBeforeOrder] = useState<number[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(categories.map((_, index) => index));
  }, [categories]);

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({ name: newCategoryName, order: 0 });
      toast.success("Category added");
      setNewCategoryName("");
    } catch (err) {
      toast.error("Failed to add category");
      console.error(err);
    }
  };

  const handleRemove = async (id: CategoryDto['id'], replaceWithId?: CategoryDto['id']) => {
    try {
      if (replaceWithId) {
        await reassignCategories({ fromCategoryName: id, toCategoryName: replaceWithId })
      }
      await deleteCategory(id);
      toast.success("Category removed");
    } catch (err) {
      toast.error("Remove failed");
      console.error(err);
    }
  };

  const handleReorder = async () => {
    if (reordering) {
      // "Done" clicked — persist the reorder
      const afterOrder = order;
      const orderedIds = afterOrder.map((idx) => categories[idx].id);

      // Debug: log before vs after for tracking
      const beforeIds = beforeOrder.map((idx) => categories[idx].id);
      console.debug("Categories reorder — before:", beforeIds, "after:", orderedIds);

      try {
        await reorderCategories({ orderedIds });
        toast.success("Reorder saved");
      } catch (err) {
        toast.error("Reorder failed");
        console.error(err);
        // Revert to before state on failure
        setOrder(beforeOrder);
      }
      setReordering(false);
    } else {
      // "Reorder" clicked — capture the "before" snapshot and enter reorder mode
      setBeforeOrder([...order]);
      setReordering(true);
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setOrder((prev) => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index - 1],
      ];
      return newOrder;
    });
  };

  const moveDown = (index: number) => {
    if (index >= order.length - 1) return;
    setOrder((prev) => {
      const newOrder = [...prev];
      [newOrder[index + 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index + 1],
      ];
      return newOrder;
    });
  };

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-center gap-2">
        {reordering && <div className="flex-grow" />}
        {!reordering && (
          <>
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <Button onClick={handleAdd}>Add</Button>
          </>
        )}

        <Button variant="secondary" onClick={handleReorder}>
          {reordering ? "Done" : "Reorder"}
        </Button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {order.map((index, i) => {
            const category = categories[index];
            if (!category) return null; // Handle case where category might not exist
            return (
              <motion.div
                key={category.id}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                // className="flex items-center gap-2 p-2 border rounded bg-white shadow-sm transition-all"
              >
                {reordering && (
                  <div className="flex flex-row gap-4 items-center">
                    <Button
                      size="icon"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => moveDown(i)}
                      disabled={i === order.length - 1}
                    >
                      <ChevronDown />
                    </Button>
                    <Badge variant={"secondary"}>{i + 1}</Badge>
                    <div>{category.name}</div>
                  </div>
                )}
                {!reordering && (
                  <div className="flex flex-row gap-4 items-center">
                    <CategoryEditor category={category} />
                    <CategoryReplaceDialog
                      category={category}
                      trigger={
                        <Button variant="outline">
                          <Trash2Icon />
                        </Button>
                      }
                      onConfirm={(replacementId) => {
                        if (!replacementId) return;
                        handleRemove(category.id, replacementId);
                      }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
