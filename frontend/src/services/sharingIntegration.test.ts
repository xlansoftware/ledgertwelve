// ---------------------------------------------------------------------------
// Integration test — book sharing flow
//
// Tests the full flow:
//   1. Login with user A (john@example.com)
//   2. Add user B (friend@example.com) as a global share
//   3. User A creates a new book
//   4. Login with user B
//   5. Verify user B sees the book that user A created
//
// Uses the existing MSW handlers (no mocks on API calls).
// Relies on the test-setup to seed the initial session for user A.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import { login, logout } from "./authService"
import { getBooks, createBook, addGlobalShare } from "./booksService"
import type { BookDto } from "@/types"

describe("Sharing integration — book created by user A visible to user B", () => {
  // The test-setup seeds session as usr_1 (john@example.com).

  it("completes the full sharing flow: user A shares → creates book → user B sees it", async () => {
    // ================================================================
    // Step 1 — Login as user A (john@example.com)
    //
    // The test-setup already seeds a session for usr_1, but we login
    // explicitly to be clear about who is acting and to set the
    // mock's currentUser to the correct value.
    // ================================================================

    await login({ email: "john@example.com", password: "secret-password" })

    // Verify user A's initial books
    const userABooksBefore = await getBooks()
    expect(userABooksBefore.length).toBeGreaterThanOrEqual(2)
    const userANamesBefore = userABooksBefore.map((b: BookDto) => b.name)
    expect(userANamesBefore).toContain("Main")
    expect(userANamesBefore).toContain("Vacation 2026")

    // ================================================================
    // Step 2 — Add user B (friend@example.com) as a global share
    //
    // POST /api/v1/shares grants edit access to ALL books owned by
    // user A (both existing and future ones).
    // ================================================================

    const shareResult = await addGlobalShare("friend@example.com")
    expect(shareResult).toMatchObject({
      userId: "usr_2",
      email: "friend@example.com",
      affectedBooks: expect.any(Number),
    })
    expect(shareResult.affectedBooks).toBeGreaterThanOrEqual(2)

    // ================================================================
    // Step 3 — User A creates a new book
    //
    // Per API.md: "When a new book is created, all currently shared
    // users receive edit access to it automatically (server-side)."
    // The mock handler implements this logic.
    // ================================================================

    const NEW_BOOK_NAME = "Shared Vacation Fund"
    const createdBook = await createBook({
      name: NEW_BOOK_NAME,
      currency: "EUR",
    })
    expect(createdBook.name).toBe(NEW_BOOK_NAME)
    expect(createdBook.ownerId).toBe("usr_1")

    // Verify user A sees the new book
    const userABooksAfter = await getBooks()
    const userANamesAfter = userABooksAfter.map((b: BookDto) => b.name)
    expect(userANamesAfter).toContain(NEW_BOOK_NAME)

    // Verify the new book includes user B as a shared user
    expect(createdBook.sharedWith).toBeDefined()
    const sharedUserIds = createdBook.sharedWith!.map((s) => s.userId)
    expect(sharedUserIds).toContain("usr_2")

    // ================================================================
    // Step 4 — Logout user A and login as user B (friend@example.com)
    // ================================================================

    await logout()
    await login({
      email: "friend@example.com",
      password: "friend-password",
    })

    // ================================================================
    // Step 5 — Verify user B sees the book that user A created
    // ================================================================

    const userBBooks = await getBooks()
    const userBNames = userBBooks.map((b: BookDto) => b.name)

    // User B should see the newly created book (shared via auto-propagation)
    expect(userBNames).toContain(NEW_BOOK_NAME)

    // User B should also see all of user A's other books (Main, Vacation 2026)
    // because the global share was applied to all owned books
    expect(userBNames).toContain("Main")
    expect(userBNames).toContain("Vacation 2026")

    // Verify user B sees the book with correct ownership (still user A's book)
    const sharedBook = userBBooks.find((b: BookDto) => b.name === NEW_BOOK_NAME)!
    expect(sharedBook.ownerId).toBe("usr_1")

    // Verify the book shows user B in its sharedWith
    expect(sharedBook.sharedWith).toBeDefined()
    expect(sharedBook.sharedWith!.some((s) => s.userId === "usr_2")).toBe(true)
  })
})