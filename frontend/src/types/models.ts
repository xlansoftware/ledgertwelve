export interface Transaction {
  id: string
  value: number
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

export interface Book {
  id: string
  name: string
  currency: string
  color: string | null
  status: string
}

export interface DashboardAggregate {
  periodStart: string
  book: string
  author: string
  category: string
  sumValue: number
  transactionCount: number
}