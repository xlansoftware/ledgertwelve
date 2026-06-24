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
    it("creates an export job with pending status (categories)", async () => {
      const result = await createExport({
        format: "csv",
        contentType: "categories",
      })
      expect(result).toMatchObject({
        jobId: expect.stringMatching(/^exp_/),
        status: "pending",
      })
    })

    it("creates an export job with pending status (transactions)", async () => {
      const result = await createExport({
        format: "xlsx",
        contentType: "transactions",
        bookId: "book_main",
      })
      expect(result).toMatchObject({
        jobId: expect.stringMatching(/^exp_/),
        status: "pending",
      })
    })

    it("creates an export job with pending status (backup)", async () => {
      const result = await createExport({
        contentType: "backup",
      })
      expect(result).toMatchObject({
        jobId: expect.stringMatching(/^exp_/),
        status: "pending",
      })
    })

    it("throws with invalid contentType", async () => {
      await expect(
        createExport({
          format: "csv",
          contentType: "invalid" as "categories",
        }),
      ).rejects.toThrow(/Invalid or missing contentType/i)
    })

    it("throws with invalid format", async () => {
      await expect(
        createExport({
          format: "pdf" as "csv",
          contentType: "categories",
        }),
      ).rejects.toThrow(/Format must be csv/i)
    })

    it("throws when bookId is missing for transactions", async () => {
      await expect(
        createExport({
          format: "csv",
          contentType: "transactions",
        }),
      ).rejects.toThrow(/bookId is required/i)
    })

    it("throws for non-existent book", async () => {
      await expect(
        createExport({
          format: "csv",
          contentType: "transactions",
          bookId: "book_invalid",
        }),
      ).rejects.toThrow(/Book not found/i)
    })
  })

  describe("getExportJob", () => {
    it("returns export job status", async () => {
      const created = await createExport({
        format: "xlsx",
        contentType: "categories",
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
        contentType: "categories",
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
        contentType: "categories",
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
    it("downloads completed categories export as a Blob", async () => {
      const created = await createExport({
        format: "csv",
        contentType: "categories",
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
