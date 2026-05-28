// ---------------------------------------------------------------------------
// Transaction utility functions — formatting, grouping, relative dates
// ---------------------------------------------------------------------------

import type { Transaction } from '@/types/models'

// ---------------------------------------------------------------------------
// Amount formatting
// ---------------------------------------------------------------------------

export function formatRelativeDateTime(dateStr: string): string {
  const date = new Date(dateStr)

  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`

  const dateOnly = new Date(date)
  dateOnly.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateOnly.getTime() === today.getTime()) {
    return `Today ${timeStr}`
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr}`
  }

  return formatRelativeDate(dateStr) + ' ' + timeStr
}

export function formatAmount(value: number): string {
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Relative date formatting
// ---------------------------------------------------------------------------

const today = new Date()
today.setHours(0, 0, 0, 0)

const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
}

function getDayName(date: Date): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[date.getDay()]
}

function formatMonthDay(date: Date, showYearIfNotCurrent: boolean): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = String(date.getDate()).padStart(2, '0')

  if (showYearIfNotCurrent && date.getFullYear() !== today.getFullYear()) {
    return `${month} ${day}, ${date.getFullYear()}`
  }
  return `${month} ${day}`
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)

  if (isSameDay(date, today)) {
    return 'Today'
  }
  if (isSameDay(date, yesterday)) {
    return 'Yesterday'
  }

  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) {
    return getDayName(date)
  }

  // For dates older than a week, show month + day; include year if not current
  return formatMonthDay(date, true)
}

// ---------------------------------------------------------------------------
// Grouping transactions by relative date buckets
// ---------------------------------------------------------------------------

export function groupTransactionsByDay(transactions: Transaction[]): (Transaction | string)[] {
  const groups: string[] = []
  const items: (Transaction | string)[] = []

  for (const tx of transactions) {
    const label = formatRelativeDate(tx.date)

    // Start a new group when label changes
    if (!groups.includes(label)) {
      groups.push(label)
      items.push(label)
    }
    items.push(tx)
  }

  return items
}