// ---------------------------------------------------------------------------
// importsService.test.ts — tests for the HTTP import service layer
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { importData } from "./importsService"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }))
afterAll(() => server.close())

describe("importsService", () => {
  it("sends an import request and returns the result", async () => {
    server.use(
      http.post("/api/v1/imports", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body.preview).toBe(true)
        expect(body.entityType).toBe("transactions")
        expect(Array.isArray(body.rows)).toBe(true)
        return HttpResponse.json({
          data: {
            created: 10,
            updated: 0,
            deleted: 0,
            errors: 0,
            warnings: 0,
            issues: [],
          },
        })
      }),
    )

    const result = await importData({
      preview: true,
      entityType: "transactions",
      bookId: "book_main",
      rows: [{ dateTime: "2026-01-01T00:00:00Z", amount: -100 }],
      mapping: { Date: "dateTime", Amount: "amount" },
    })

    expect(result.created).toBe(10)
    expect(result.errors).toBe(0)
  })

  it("handles backup import response with nested counts", async () => {
    server.use(
      http.post("/api/v1/imports", async () => {
        return HttpResponse.json({
          data: {
            books: { created: 1, updated: 1, deleted: 0, errors: 0, warnings: 0, issues: [] },
            categories: { created: 5, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
            transactions: { created: 100, updated: 50, deleted: 0, errors: 2, warnings: 1, issues: [] },
          },
        })
      }),
    )

    const result = await importData({
      preview: false,
      entityType: "backup",
      data: {
        version: 1,
        books: [],
        categories: [],
        transactions: [],
      },
    })

    expect(result.books?.created).toBe(1)
    expect(result.categories?.created).toBe(5)
    expect(result.transactions?.created).toBe(100)
    expect(result.transactions?.errors).toBe(2)
  })

  it("throws on server error", async () => {
    server.use(
      http.post("/api/v1/imports", async () => {
        return HttpResponse.json(
          { error: "entityType is required" },
          { status: 400 },
        )
      }),
    )

    await expect(
      importData({
        preview: true,
        entityType: "transactions",
        rows: [],
        mapping: {},
      }),
    ).rejects.toThrow("entityType is required")
  })
})
