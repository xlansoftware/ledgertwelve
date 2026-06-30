import { Card, CardContent } from "@/components/ui/card";
import { iconMap } from "@/lib/getIcon";
import { formatCurrency, formatDate, invertColor } from "@/lib/my-utils";
import { useCategoriesStore, useUsersStore } from "@/store";
import type { TransactionDto } from "@/types";
import TransactionRowMenu from "./TransactionRowMenu";
import { MoreHorizontal } from "lucide-react";

interface TransactionRowProps {
  transaction: TransactionDto;
}

function transactionValue(transaction: TransactionDto) {
  return formatCurrency(transaction.amount, 2);
}

function explainValue(value: number, exchangeRate?: number, currency?: string) {
  if (!currency) return null;
  if (!exchangeRate) return null;
  return `${formatCurrency(value, 2)} x ${formatCurrency(exchangeRate, 4) ?? 1.0} ${currency}`;
}

function explainTransactionValue(transaction: TransactionDto) {
  return explainValue(
    transaction.originalAmount || 0,
    transaction.exchangeRate,
    transaction.originalCurrency
  );
}

export default function TransactionRow({
  transaction,
}: TransactionRowProps) {
  const users = useUsersStore((s) => s.users)
  const categories = useCategoriesStore((s) => s.categories);
  const transactionCategory = categories.find((c) => c.name === transaction.categoryName);
  const category = transactionCategory;
  const title = transaction.note || category?.name || "No category";
  // const Icon = getIcon(transactionCategory?.icon);
  const IconComponent =
    iconMap[transactionCategory?.icon ?? ""] ?? MoreHorizontal;
  return (
    <Card
      data-testid={`Item: ${title}, ${transactionValue(transaction)}`}
      aria-label={`Item: ${title}, ${transactionValue(transaction)}`}
      className="overflow-hidden border-t border-b border-l-0 border-r-0 rounded-none p-0">
      <CardContent className="p-0">
        <div className="flex flex-row">
          <div
            className="p-2 bg-muted flex items-center"
            style={
              transactionCategory?.color
                ? {
                  backgroundColor: transactionCategory?.color,
                  color: invertColor(transactionCategory?.color),
                }
                : {}
            }
          >
            {transactionCategory?.icon && (
              <div className="flex-shrink-0">
                <IconComponent />
              </div>
            )}
          </div>
          <div className="pl-2 pt-1 pb-1 flex-grow flex items-start justify-between overflow-hidden">
            <div
              className="flex items-start gap-2 cursor-pointer truncate"
              onClick={() => { console.log("..."); }}
            >
              <div className="flex flex-row gap-2 items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{title}</div>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-sm text-muted-foreground overflow-hidden">
                    <div className="truncate overflow-hidden text-ellipsis whitespace-nowrap">
                      {users.find((u) => u.id === transaction.userId || u.email === transaction.userId)?.email}
                    </div>
                    <div className="truncate overflow-hidden text-ellipsis whitespace-nowrap">
                      {formatDate(new Date(transaction.dateTime))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {category?.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-shrink-0 items-end">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="font-bold">
                    {transactionValue(transaction)}
                  </div>
                </div>

                <TransactionRowMenu transaction={transaction} />
              </div>
              <div className="pr-2 text-sm text-muted-foreground">
                {explainTransactionValue(transaction)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
