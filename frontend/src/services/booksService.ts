import { request } from "./api"
import type {
  ApiResponse,
  BookDto,
  BookStatsDto,
  DeleteResponse,
  ShareResponse,
  GlobalShareResponse,
  GlobalShareRemoveResponse,
  CloseBookResponse,
  ReopenBookResponse,
} from "@/types"

// ---------------------------------------------------------------------------
// GET   /api/v1/books
// ---------------------------------------------------------------------------

export async function getBooks(): Promise<BookDto[]> {
  const res = await request<ApiResponse<BookDto[]>>("/api/v1/books")
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/books/{bookId}
// ---------------------------------------------------------------------------

export async function getBook(bookId: string): Promise<BookDto> {
  const res = await request<ApiResponse<BookDto>>(`/api/v1/books/${bookId}`)
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/books
// ---------------------------------------------------------------------------

export interface CreateBookRequest {
  name: string
  currency?: string
}

export async function createBook(req: CreateBookRequest): Promise<BookDto> {
  const res = await request<ApiResponse<BookDto>>("/api/v1/books", {
    method: "POST",
    body: req,
  })
  return res.data
}

// ---------------------------------------------------------------------------
// PUT   /api/v1/books/{bookId}
// ---------------------------------------------------------------------------

export interface UpdateBookRequest {
  name?: string
  currency?: string
}

export async function updateBook(
  bookId: string,
  req: UpdateBookRequest,
): Promise<BookDto> {
  const res = await request<ApiResponse<BookDto>>(`/api/v1/books/${bookId}`, {
    method: "PUT",
    body: req,
  })
  return res.data
}

// ---------------------------------------------------------------------------
// DELETE  /api/v1/books/{bookId}
// ---------------------------------------------------------------------------

export async function deleteBook(bookId: string): Promise<void> {
  await request<ApiResponse<DeleteResponse>>(`/api/v1/books/${bookId}`, {
    method: "DELETE",
  })
}

// ---------------------------------------------------------------------------
// POST  /api/v1/books/{bookId}/shares
// ---------------------------------------------------------------------------

export interface AddShareRequest {
  email: string
  permission: "view" | "edit"
}

export async function addShare(
  bookId: string,
  req: AddShareRequest,
): Promise<ShareResponse> {
  const res = await request<ApiResponse<ShareResponse>>(
    `/api/v1/books/${bookId}/shares`,
    { method: "POST", body: req },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// PUT   /api/v1/books/{bookId}/shares/{userId}
// ---------------------------------------------------------------------------

export interface UpdateShareRequest {
  permission: "view" | "edit"
}

export async function updateShare(
  bookId: string,
  userId: string,
  req: UpdateShareRequest,
): Promise<ShareResponse> {
  const res = await request<ApiResponse<ShareResponse>>(
    `/api/v1/books/${bookId}/shares/${userId}`,
    { method: "PUT", body: req },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// DELETE  /api/v1/books/{bookId}/shares/{userId}
// ---------------------------------------------------------------------------

export async function removeShare(bookId: string, userId: string): Promise<void> {
  await request<ApiResponse<{ removed: true }>>(
    `/api/v1/books/${bookId}/shares/${userId}`,
    { method: "DELETE" },
  )
}

// ---------------------------------------------------------------------------
// POST  /api/v1/shares
// ---------------------------------------------------------------------------

export async function addGlobalShare(email: string): Promise<GlobalShareResponse> {
  const res = await request<ApiResponse<GlobalShareResponse>>("/api/v1/shares", {
    method: "POST",
    body: { email },
  })
  return res.data
}

// ---------------------------------------------------------------------------
// DELETE  /api/v1/shares/{userId}
// ---------------------------------------------------------------------------

export async function removeGlobalShare(userId: string): Promise<void> {
  await request<ApiResponse<GlobalShareRemoveResponse>>(
    `/api/v1/shares/${userId}`,
    { method: "DELETE" },
  )
}

// ---------------------------------------------------------------------------
// GET   /api/v1/books/current
// ---------------------------------------------------------------------------

export async function getCurrentBook(): Promise<BookDto> {
  const res = await request<ApiResponse<BookDto>>("/api/v1/books/current")
  return res.data
}

// ---------------------------------------------------------------------------
// PUT   /api/v1/books/current
// ---------------------------------------------------------------------------

export async function setCurrentBook(bookId: string): Promise<BookDto> {
  const res = await request<ApiResponse<BookDto>>("/api/v1/books/current", {
    method: "PUT",
    body: { bookId },
  })
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/books/{bookId}/stats
// ---------------------------------------------------------------------------

export interface GetBookStatsParams {
  asOf?: string   // "YYYY-MM-DD" — compute stats as of end of day on this date
}

export async function getBookStats(
  bookId: string,
  params?: GetBookStatsParams,
): Promise<BookStatsDto> {
  const searchParams = new URLSearchParams()
  if (params?.asOf) {
    searchParams.set("asOf", params.asOf)
  }
  const query = searchParams.toString()
  const url = `/api/v1/books/${bookId}/stats${query ? `?${query}` : ""}`
  const res = await request<ApiResponse<BookStatsDto>>(url)
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/books/{bookId}/close
// ---------------------------------------------------------------------------

export interface CloseBookRequest {
  closingCategoryName: string
}

export async function closeBook(
  bookId: string,
  req: CloseBookRequest,
): Promise<CloseBookResponse> {
  const res = await request<ApiResponse<CloseBookResponse>>(
    `/api/v1/books/${bookId}/close`,
    { method: "POST", body: req },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/books/{bookId}/reopen
// ---------------------------------------------------------------------------

export async function reopenBook(bookId: string): Promise<ReopenBookResponse> {
  const res = await request<ApiResponse<ReopenBookResponse>>(
    `/api/v1/books/${bookId}/reopen`,
    { method: "POST" },
  )
  return res.data
}