export interface Transaction {
  id: string
  value: number
  currency: string
  category: string
  author: string
  book: string | null
  date: string
}

export interface DashboardAggregate {
  periodStart: string
  book: string
  author: string
  category: string
  currency: string
  sumValue: number
  transactionCount: number
}