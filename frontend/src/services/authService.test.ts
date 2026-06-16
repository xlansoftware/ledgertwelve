// ---------------------------------------------------------------------------
// Unit tests — authService
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { login, whoami } from "./authService"
import { server } from "../test-setup"

const validCredentials = { email: "john@example.com", password: "secret-password" }

describe("authService", () => {
  describe("login", () => {
    it("returns user summary on valid credentials", async () => {
      const result = await login(validCredentials)
      expect(result).toEqual({
        id: "usr_1",
        email: "john@example.com",
      })
    })

    it("throws on invalid password", async () => {
      await expect(
        login({ email: "john@example.com", password: "wrong" }),
      ).rejects.toThrow(/Invalid credentials/i)
    })

    it("throws when email is empty", async () => {
      await expect(
        login({ email: "", password: "secret-password" }),
      ).rejects.toThrow(/Email and password required/i)
    })
  })

  describe("whoami", () => {
    it("throws 401 when not authenticated", async () => {
      server.use(
        http.get("/api/v1/auth/whoami", () =>
          HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
        ),
      )
      await expect(whoami()).rejects.toThrow(/Unauthorized/i)
    })

    it("returns the current user when authenticated", async () => {
      await login(validCredentials)
      const result = await whoami()
      expect(result).toEqual({
        id: "usr_1",
        email: "john@example.com",
      })
    })
  })
})