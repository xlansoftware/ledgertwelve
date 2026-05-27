export interface Transaction {
  id: string
  value: number
  currency: string
  category: string
  author: string
  book: string | null
  notes: string | null
  date: string
}

export interface Category {
  id: string
  name: string
  color: string | null
  displayOrder: number | null
  icon: string | null
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