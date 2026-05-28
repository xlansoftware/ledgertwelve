type TransactionGroupRowProps = {
  label: string
}

export default function TransactionGroupRow({ label }: TransactionGroupRowProps) {
  return (
    <div className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/30 sticky top-0 z-10">
      {label}
    </div>
  )
}
