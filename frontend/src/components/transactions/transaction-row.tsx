import type { Transaction } from '@/types/models'
import { formatAmount, formatRelativeDateTime } from '@/lib/transaction-utils'
import { cn } from '@/lib/utils'

type TransactionRowProps = {
  transaction: Transaction
  categoryColor: string | null
  onClick?: () => void
}

export default function TransactionRow({
  transaction,
  categoryColor,
  onClick,
}: TransactionRowProps) {
  const title = transaction.notes || transaction.category
  const timestamp = formatRelativeDateTime(transaction.date)
  const isExpense = transaction.value < 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 border-b bg-background hover:bg-muted/40 active:bg-muted cursor-pointer transition-colors min-h-[64px]',
      )}
    >
      {/* Icon area */}
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: categoryColor ?? '#6b7280' }}
      >
        <svg
          className="w-5 h-5 text-primary-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h11M9 21V10m0 0l-4 4m4-4l4 4"
          />
        </svg>
      </div>

      {/* Middle content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-none truncate">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {transaction.author} · {timestamp}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {transaction.category}
        </p>
      </div>

      {/* Amount */}
      <span
        className={cn(
          'text-right font-semibold text-base tabular-nums whitespace-nowrap',
          isExpense ? 'text-destructive' : 'text-foreground',
        )}
      >
        {formatAmount(transaction.value)}
      </span>
    </div>
  )
}