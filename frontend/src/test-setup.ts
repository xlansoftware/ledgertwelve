// ---------------------------------------------------------------------------
// Vitest setup — MSW server for all service tests
// ---------------------------------------------------------------------------

import "@testing-library/jest-dom"

import { setupServer } from "msw/node"
import { handlers, seedSession } from "./mocks/handlers"
import { afterAll, afterEach, beforeAll } from "vitest"

export const server = setupServer(...handlers)

// Seed a persistent test session
const TEST_TOKEN = seedSession("usr_1")

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" })

  // MSW v2's FetchInterceptor replaces globalThis.fetch with its own
  // fetchProxy during server.listen(). Now wrap that proxy so every
  // API request includes the session cookie — undici won't propagate
  // cookies from Set-Cookie responses in Node, so we inject them at
  // the fetch level instead.
  const mswFetch = globalThis.fetch
  globalThis.fetch = function fetchWithCookie(input, init?) {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input)

    if (urlStr.includes("/api/v1/")) {
      const plainHeaders: Record<string, string> = {}
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
      return mswFetch.call(globalThis, input, { ...init, headers: plainHeaders })
    }

    return mswFetch.call(globalThis, input, init)
  } as typeof globalThis.fetch
})

afterEach(() => server.resetHandlers())
afterAll(() => server.close())