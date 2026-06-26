// ---------------------------------------------------------------------------
// useClosedBookBalances — fetches stats for closed books
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react"
import { getFactory } from "@/features/offline"
import type { BookDto } from "@/types"

export interface UseClosedBookBalancesResult {
  /** Map from bookId to totalSum. null while loading or if fetch failed. */
  balances: Record<string, number | null>
  /** True while any stats request is in flight. */
  isLoading: boolean
}

/**
 * Hook that accepts the full books list, filters closed books,
 * fetches stats via `Promise.all`, and returns a map of balances.
 *
 * Closed books whose stats fail to load silently get a `null` balance.
 * The hook uses a counter pattern to ignore stale responses.
 */
export function useClosedBookBalances(books: BookDto[]): UseClosedBookBalancesResult {
  const [balances, setBalances] = useState<Record<string, number | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const counterRef = useRef(0)

  useEffect(() => {
    const closedBooks = books.filter((b) => b.status === "closed")

    if (closedBooks.length === 0) {
      setBalances({})
      setIsLoading(false)
      return
    }

    // Initialise all balances as null (loading)
    const initial: Record<string, number | null> = {}
    for (const book of closedBooks) {
      initial[book.id] = null
    }
    setBalances(initial)
    setIsLoading(true)

    const callId = ++counterRef.current

    const promises = closedBooks.map((book) =>
      getFactory()
        .books.getBookStats(book.id)
        .then((stats) => ({ bookId: book.id, totalSum: stats.totalSum }))
        .catch(() => ({ bookId: book.id, totalSum: null as null })),
    )

    Promise.all(promises).then((results) => {
      // Ignore stale responses
      if (callId !== counterRef.current) return

      const next: Record<string, number | null> = {}
      for (const result of results) {
        next[result.bookId] = result.totalSum
      }
      setBalances(next)
      setIsLoading(false)
    })

    return () => {
      counterRef.current += 1
    }
  }, [books])

  return { balances, isLoading }
}
