// ---------------------------------------------------------------------------
// Unit tests — exportsService
// ---------------------------------------------------------------------------

import { describe, expect, it, vi } from "vitest"
import { createExport, getExportJob, downloadExport } from "./exportsService"
import { login } from "./authService"

describe("exportsService", () => {
  beforeAll(async () => {
    await login({ email: "john@example.com", password: "secret-password" })
  })

  describe("createExport", () => {
    it("creates an export job with pending status", async () => {
      const result = await createExport({
        format: "csv",
        bookId: "book_main",
        from: "2026-01-01",
        to: "2026-12-31",
      })
      expect(result).toMatchObject({
        jobId: expect.stringMatching(/^exp_/),
        status: "pending",
      })
    })

    it("throws with invalid format", async () => {
      await expect(
        createExport({
          format: "pdf" as "csv",
          bookId: "book_main",
        }),
      ).rejects.toThrow(/Format must be csv or xlsx/i)
    })

    it("throws for non-existent book", async () => {
      await expect(
        createExport({
          format: "csv",
          bookId: "book_invalid",
        }),
      ).rejects.toThrow(/Book not found/i)
    })
  })

  describe("getExportJob", () => {
    it("returns export job status", async () => {
      const created = await createExport({
        format: "xlsx",
        bookId: "book_main",
      })
      const result = await getExportJob(created.jobId)
      expect(result).toMatchObject({
        jobId: created.jobId,
        status: expect.any(String),
      })
    })

    it("throws for non-existent job", async () => {
      await expect(getExportJob("exp_invalid")).rejects.toThrow(
        /Export job not found/i,
      )
    })

    it("eventually completes the export job", async () => {
      const created = await createExport({
        format: "csv",
        bookId: "book_main",
      })

      // Wait for the async processing to finish (mock uses 50ms timeout)
      await vi.waitFor(
        async () => {
          const job = await getExportJob(created.jobId)
          expect(job.status).toBe("completed")
        },
        { timeout: 500, interval: 20 },
      )
    })

    it("provides downloadUrl when completed", async () => {
      const created = await createExport({
        format: "csv",
        bookId: "book_main",
      })

      await vi.waitFor(
        async () => {
          const job = await getExportJob(created.jobId)
          if (job.status === "completed") {
            expect(job.downloadUrl).toBeTruthy()
          }
        },
        { timeout: 500, interval: 20 },
      )
    })
  })

  describe("downloadExport", () => {
    it("downloads completed export as a Blob", async () => {
      const created = await createExport({
        format: "csv",
        bookId: "book_main",
      })

      // Wait for completion
      await vi.waitFor(
        async () => {
          const job = await getExportJob(created.jobId)
          expect(job.status).toBe("completed")
        },
        { timeout: 500, interval: 20 },
      )

      const blob = await downloadExport(created.jobId)
      expect(blob).toBeInstanceOf(Blob)
    })
  })
})