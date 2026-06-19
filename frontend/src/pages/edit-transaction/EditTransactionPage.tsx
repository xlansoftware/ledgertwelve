import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { useTransactionsStore, useCategoriesStore } from "@/store";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper — convert ISO string to datetime-local value
// ---------------------------------------------------------------------------

function isoToDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EditTransactionPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  // Store state
  const currentTransaction = useTransactionsStore((s) => s.currentTransaction);
  const isLoading = useTransactionsStore((s) => s.isLoading);
  const fetchError = useTransactionsStore((s) => s.error);
  const fetchTransaction = useTransactionsStore((s) => s.fetchTransaction);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const clearError = useTransactionsStore((s) => s.clearError);

  const categories = useCategoriesStore((s) => s.categories);
  const fetchCategories = useCategoriesStore((s) => s.fetchCategories);

  // Form state
  const [dateTime, setDateTime] = useState("");
  const [amount, setAmount] = useState("");
  const [originalCurrency, setOriginalCurrency] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [note, setNote] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track whether form has been initialized from fetched data
  const formInitialized = useRef(false);

  // Fetch transaction and categories on mount
  useEffect(() => {
    if (transactionId) {
      clearError();
      formInitialized.current = false;
      fetchTransaction(transactionId).catch(() => {
        // Error is already handled in the store — nothing else to do
      });
    }
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [transactionId, fetchTransaction, fetchCategories, clearError, categories.length]);

  // Pre-populate form when transaction data arrives
  useEffect(() => {
    if (currentTransaction && !formInitialized.current) {
      setDateTime(isoToDatetimeLocal(currentTransaction.dateTime));
      setAmount(String(currentTransaction.amount));
      setOriginalCurrency(currentTransaction.originalCurrency ?? "");
      setOriginalAmount(
        currentTransaction.originalAmount != null
          ? String(currentTransaction.originalAmount)
          : "",
      );
      setExchangeRate(
        currentTransaction.exchangeRate != null
          ? String(currentTransaction.exchangeRate)
          : "",
      );
      setCategoryName(currentTransaction.categoryName ?? "");
      setNote(currentTransaction.note ?? "");
      formInitialized.current = true;
    }
  }, [currentTransaction]);

  // Reset form initialization when transactionId changes (direct navigation)
  useEffect(() => {
    formInitialized.current = false;
  }, [transactionId]);

  // --- Handlers ---

  const handleCancel = () => {
    navigate("/history");
  };

  const handleSave = async () => {
    if (!transactionId) return;
    setSaveError(null);
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        dateTime: new Date(dateTime).toISOString(),
        amount: parseFloat(amount),
        categoryName: categoryName || undefined,
        note: note || undefined,
      };

      if (originalCurrency.trim()) {
        payload.originalCurrency = originalCurrency.trim();
        payload.originalAmount = parseFloat(originalAmount);
        payload.exchangeRate = parseFloat(exchangeRate);
      } else {
        payload.originalCurrency = undefined;
        payload.originalAmount = undefined;
        payload.exchangeRate = undefined;
      }

      await updateTransaction(transactionId, payload as Parameters<typeof updateTransaction>[1]);
      toast.success("Transaction updated");
      navigate("/history");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update transaction";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const showMultiCurrency = originalCurrency.trim().length > 0;

  // --- Render: loading state ---

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <FormSkeleton />
      </div>
    );
  }

  // --- Render: fetch error (transaction not found, etc.) ---

  if (fetchError && !currentTransaction) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-lg font-medium text-destructive">
            {fetchError}
          </p>
          <p className="text-sm text-muted-foreground">
            The transaction you are looking for could not be loaded.
          </p>
          <Button variant="outline" onClick={() => navigate("/history")}>
            Go to History
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: form ---

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Transaction</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div
          className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="save-error"
        >
          {saveError}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-5">
        {/* Date/time */}
        <div className="space-y-1.5">
          <Label htmlFor="dateTime">Date & Time</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Original currency */}
        <div className="space-y-1.5">
          <Label htmlFor="originalCurrency">
            Original Currency{" "}
            <span className="font-normal text-muted-foreground normal-case tracking-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="originalCurrency"
            type="text"
            placeholder="e.g. USD"
            value={originalCurrency}
            onChange={(e) => setOriginalCurrency(e.target.value.toUpperCase())}
            maxLength={3}
          />
        </div>

        {/* Multi-currency fields — shown only when original currency is set */}
        {showMultiCurrency && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="originalAmount">Original Amount</Label>
              <Input
                id="originalAmount"
                type="number"
                step="any"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exchangeRate">Exchange Rate</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="any"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Category combobox */}
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Combobox
            value={categoryName}
            onValueChange={(value) => setCategoryName(value ?? "")}
          >
            <ComboboxInput
              showTrigger
              placeholder="Select category…"
              className="w-full"
            />
            <ComboboxContent className="w-full">
              <ComboboxList>
                {categories.map((cat) => (
                  <ComboboxItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <Label htmlFor="note">Note</Label>
          <Input
            id="note"
            type="text"
            placeholder="Add a note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}