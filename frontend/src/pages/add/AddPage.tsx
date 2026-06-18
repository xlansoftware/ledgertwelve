import { Input } from "@/components/ui/input";
import AmountInput from "./AmountInput";
import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import CategoryPicker from "./CategoryPicker";
import ConvertDialog from "./ConvertDialog";
import type { ConvertResult } from "./useConvertDialogState";
import type { CategoryDto, TransactionDto } from "@/types";
import { useBooksStore, useTransactionsStore } from "@/store";
import { toast } from "sonner"
import { playSound } from "@/lib/playSound";
import { useSuccessOverlay } from "@/components/common/success";

// ---------------------------------------------------------------------------
// Types for pending transaction state
// ---------------------------------------------------------------------------

interface PendingTransaction {
  originalAmount: number
  originalCurrency: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddPage() {
  const [notes, setNotes] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);
  const createTransaction = useTransactionsStore((s) => s.createTransaction);

  const currentBook = useBooksStore((s) => s.currentBook);

  const { showSuccess } = useSuccessOverlay();

  const handleAdd = async (transaction: Partial<TransactionDto>) => {
    const originalCurrency = transaction.originalCurrency;
    const originalAmount = transaction.originalAmount!;
    const bookCurrency = currentBook?.currency;

    // If currencies differ and book has a currency, show the conversion dialog
    if (
      originalCurrency &&
      bookCurrency &&
      originalCurrency.toUpperCase() !== bookCurrency.toUpperCase()
    ) {
      setPendingTx({ originalAmount, originalCurrency });
      return; // Dialog will handle the rest
    }

    // Same currency (or no book currency) — proceed directly
    await commitTransaction({
      amount: originalAmount,
      originalAmount,
      originalCurrency: originalCurrency ?? undefined,
      exchangeRate: 1.0,
    });
  };

  const commitTransaction = async (result: {
    amount: number
    originalAmount: number
    originalCurrency: string | undefined
    exchangeRate: number
  }) => {
    try {
      await createTransaction({
        bookId: currentBook?.id || "default",
        amount: result.amount,
        originalAmount: result.originalAmount,
        originalCurrency: result.originalCurrency || undefined,
        exchangeRate: result.exchangeRate,
        categoryName: selectedCategory?.name,
        note: notes
      });
      // reset controls
      setNotes("");
      setSelectedCategory(null);

      playSound(); // don't wait for finish
      await showSuccess({ playSound: false });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Error adding transaction");
    }
  };

  const handleConvertConfirm = useCallback(
    (result: ConvertResult) => {
      commitTransaction({
        amount: result.amount,
        originalAmount: result.originalAmount,
        originalCurrency: result.originalCurrency,
        exchangeRate: result.exchangeRate,
      });
      setPendingTx(null);
    },
    [notes, selectedCategory, currentBook],
  );

  const handleConvertCancel = useCallback(() => {
    setPendingTx(null);
  }, []);

  const dialogOpen =
    pendingTx !== null &&
    !!currentBook?.currency &&
    pendingTx.originalCurrency.toUpperCase() !== currentBook.currency.toUpperCase();

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

      {/* Currency Conversion Dialog */}
      {pendingTx && currentBook?.currency && (
        <ConvertDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) handleConvertCancel()
          }}
          originalAmount={pendingTx.originalAmount}
          originalCurrency={pendingTx.originalCurrency}
          bookCurrency={currentBook.currency}
          onConfirm={handleConvertConfirm}
        />
      )}
    </div>
  );
}