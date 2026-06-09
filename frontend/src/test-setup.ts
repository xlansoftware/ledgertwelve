// ---------------------------------------------------------------------------
// Vitest setup — MSW server for all service tests
// ---------------------------------------------------------------------------

import { setupServer } from "msw/node"
import { handlers, seedSession } from "./mocks/handlers"
import { afterAll, afterEach, beforeAll } from "vitest"

export const server = setupServer(...handlers)

// Seed a persistent test session
const TEST_TOKEN = seedSession("usr_1")

// Wrap global fetch to inject the session cookie as a plain object header.
// Node.js fetch (undici) needs a plain object, not a Headers instance,
// to reliably propagate the Cookie header to MSW interception.
const originalFetch = globalThis.fetch
globalThis.fetch = function fetchWithCookie(input, init?) {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof Request
        ? input.url
        : String(input)

  if (urlStr.includes("/api/v1/")) {
    const plainHeaders: Record<string, string> = {}
    // Copy existing headers from init
    if (init?.headers) {
      const h =
        init.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : (init.headers as Record<string, string>)
      Object.assign(plainHeaders, h)
    }
    if (!plainHeaders["cookie"]) {
      plainHeaders["cookie"] = `ledger12.session=${TEST_TOKEN}`
    }
    return originalFetch(input, { ...init, headers: plainHeaders })
  }

  return originalFetch(input, init)
} as typeof globalThis.fetch

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())