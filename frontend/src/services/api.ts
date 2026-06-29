// ---------------------------------------------------------------------------
// Base API client — thin wrapper around fetch
// ---------------------------------------------------------------------------

const BASE_URL = "" // same origin in dev (Vite proxy or MSW)

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | number | string[] | undefined>
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, headers = {} } = options

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const v of value) {
          url.searchParams.append(key, String(v))
        }
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    credentials: "include", // send httpOnly session cookie
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  }

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url.toString(), fetchOptions)

  // Handle empty responses (204 No Content, etc.)
  if (response.status === 204) {
    return undefined as T
  }

  // Handle file downloads (any content type with Content-Disposition: attachment)
  const contentDisposition = response.headers.get("content-disposition") || ""
  if (contentDisposition.startsWith("attachment")) {
    return response.blob() as unknown as T
  }

  // Handle known binary content types that may not have the attachment header
  const contentType = response.headers.get("content-type") || ""
  if (contentType.startsWith("text/csv") || contentType.startsWith("application/vnd.openxmlformats")) {
    return response.blob() as unknown as T
  }

  // Parse JSON body
  const json = await response.json()

  if (!response.ok) {
    const message = json?.error || `Request failed with status ${response.status}`
    throw new ApiError(message, response.status)
  }

  return json as T
}

export { ApiError, request }
export type { RequestOptions }