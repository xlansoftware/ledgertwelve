import type { ReactNode } from 'react'

interface TransactionListProps {
  children: ReactNode
}

export default function TransactionList({ children }: TransactionListProps) {
  return <div>{children}</div>
}
