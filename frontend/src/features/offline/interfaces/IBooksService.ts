// ---------------------------------------------------------------------------
// IBooksService — interface for books domain operations
// ---------------------------------------------------------------------------

import type {
  BookDto,
  BookStatsDto,
  CloseBookResponse,
  ReopenBookResponse,
  ShareResponse,
} from "@/types"

export interface CreateBookRequest {
  name: string
  currency?: string
}

export interface UpdateBookRequest {
  name?: string
  currency?: string
}

export interface CloseBookRequest {
  closingCategoryName: string
}

export interface AddShareRequest {
  email: string
  permission: "view" | "edit"
}

export interface UpdateShareRequest {
  permission: "view" | "edit"
}

export interface GetBookStatsParams {
  asOf?: string
}

export interface IBooksService {
  getBooks(): Promise<BookDto[]>
  getBook(bookId: string): Promise<BookDto>
  createBook(req: CreateBookRequest): Promise<BookDto>
  updateBook(bookId: string, req: UpdateBookRequest): Promise<BookDto>
  deleteBook(bookId: string): Promise<void>
  addShare(bookId: string, req: AddShareRequest): Promise<ShareResponse>
  updateShare(bookId: string, userId: string, req: UpdateShareRequest): Promise<ShareResponse>
  removeShare(bookId: string, userId: string): Promise<void>
  getCurrentBook(): Promise<BookDto>
  setCurrentBook(bookId: string): Promise<BookDto>
  getBookStats(bookId: string, params?: GetBookStatsParams): Promise<BookStatsDto>
  closeBook(bookId: string, req: CloseBookRequest): Promise<CloseBookResponse>
  reopenBook(bookId: string): Promise<ReopenBookResponse>
}