import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseMoneyInput } from "@/lib/parseMoneyInput";
import type { TransactionDto } from "@/types";
import { useRef, useState } from "react";

interface AmountInputProps {
  onConfirm: (transaction: Partial<TransactionDto>) => void;
}

export default function AmountInput({ onConfirm }: AmountInputProps) {
  const refInput = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value) return;

    const amount = parseMoneyInput(value);
    if (!amount) return;

    onConfirm({ originalAmount: amount.value, originalCurrency: amount.currency });
    setValue("");
  };

  return (
    <form onSubmit={handleAdd} className="flex w-full gap-3 items-center">
      <Input
        aria-label="Amount"
        ref={refInput}
        autoFocus
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder="0.00"
        className="h-14 text-3xl font-semibold py-4 px-4 rounded-m border border-input shadow-sm focus-visible:ring-2 focus-visible:ring-primary transition-all w-full md:text-3xl lg:text-3xl"
      />
      <Button type="submit" className="h-14 px-6 text-lg font-medium rounded-m">
        Add
      </Button>
    </form>
  );
}