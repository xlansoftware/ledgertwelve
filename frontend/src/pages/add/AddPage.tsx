import { Input } from "@/components/ui/input";
import AmountInput from "./AmountInput";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import CategoryPicker from "./CategoryPicker";
import type { CategoryDto, TransactionDto } from "@/types";
import { useBooksStore, useTransactionsStore } from "@/store";
import { toast } from "sonner"
import { playSound } from "@/lib/playSound";
import { useSuccessOverlay } from "@/components/common/success";

export default function AddPage() {
  const [notes, setNotes] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);
  const createTransaction = useTransactionsStore((s) => s.createTransaction);

  const currentBook = useBooksStore((s) => s.currentBook);

  const { showSuccess } = useSuccessOverlay();

  const handleAdd = async (transaction: Partial<TransactionDto>) => {
    console.log(transaction);
    try {
      await createTransaction({
        bookId: currentBook?.id || "default",
        amount: transaction.originalAmount!,
        originalAmount: transaction.originalAmount,
        originalCurrency: transaction.originalCurrency,
        exchangeRate: 1.0,
        categoryName: selectedCategory?.name,
        note: notes
      });
      // reset controls
      setNotes("");

      playSound(); // don't wait for finish
      await showSuccess({ playSound: false });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Error adding transaction");
    }
  };

  return (
    <div className="container flex flex-col gap-4 h-full justify-between">
      <div>{currentBook?.name}</div>
      <div
        className="flex flex-col items-center gap-4 p-[2px] w-full max-w-md mx-auto"
      >
        {/* Amount Input and Add Button */}
        <AmountInput onConfirm={handleAdd} />

        {/* Notes Input */}
        <Input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-label="Notes"
          placeholder="Notes ..."
          className="text-base py-3 px-4 rounded-m border border-input shadow-sm focus-visible:ring-2 focus-visible:ring-primary transition-all w-full"
        />
      </div>

      <ScrollArea className="flex-grow overflow-y-auto">
        <CategoryPicker
          selectedId={selectedCategory?.id}
          onSelect={(cat) => setSelectedCategory(cat)}
        />
      </ScrollArea>
    </div>
  );
}