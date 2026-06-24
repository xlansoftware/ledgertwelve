// ---------------------------------------------------------------------------
// OnlineBooksService — delegates to the existing API-based booksService
// ---------------------------------------------------------------------------

import * as booksService from "@/services/booksService"
import type { IBooksService, CreateBookRequest, UpdateBookRequest, CloseBookRequest, AddShareRequest, UpdateShareRequest, GetBookStatsParams } from "@/features/offline/interfaces/IBooksService"
import type { BookDto, BookStatsDto, CloseBookResponse, ReopenBookResponse, ShareResponse, GlobalShareResponse } from "@/types"

export class OnlineBooksService implements IBooksService {
  async getBooks(): Promise<BookDto[]> {
    return booksService.getBooks()
  }

  async getBook(bookId: string): Promise<BookDto> {
    return booksService.getBook(bookId)
  }

  async createBook(req: CreateBookRequest): Promise<BookDto> {
    return booksService.createBook(req)
  }

  async updateBook(bookId: string, req: UpdateBookRequest): Promise<BookDto> {
    return booksService.updateBook(bookId, req)
  }

  async deleteBook(bookId: string): Promise<void> {
    return booksService.deleteBook(bookId)
  }

  async addShare(bookId: string, req: AddShareRequest): Promise<ShareResponse> {
    return booksService.addShare(bookId, req)
  }

  async updateShare(bookId: string, userId: string, req: UpdateShareRequest): Promise<ShareResponse> {
    return booksService.updateShare(bookId, userId, req)
  }

  async removeShare(bookId: string, userId: string): Promise<void> {
    return booksService.removeShare(bookId, userId)
  }

  async addGlobalShare(email: string): Promise<GlobalShareResponse> {
    return booksService.addGlobalShare(email)
  }

  async removeGlobalShare(userId: string): Promise<void> {
    return booksService.removeGlobalShare(userId)
  }

  async getCurrentBook(): Promise<BookDto> {
    return booksService.getCurrentBook()
  }

  async setCurrentBook(bookId: string): Promise<BookDto> {
    return booksService.setCurrentBook(bookId)
  }

  async getBookStats(bookId: string, params?: GetBookStatsParams): Promise<BookStatsDto> {
    return booksService.getBookStats(bookId, params)
  }

  async closeBook(bookId: string, req: CloseBookRequest): Promise<CloseBookResponse> {
    return booksService.closeBook(bookId, req)
  }

  async reopenBook(bookId: string): Promise<ReopenBookResponse> {
    return booksService.reopenBook(bookId)
  }
}