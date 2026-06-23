// ---------------------------------------------------------------------------
// OnlineTransactionsService — delegates to the existing API-based transactionsService
// ---------------------------------------------------------------------------

import * as transactionsService from "@/services/transactionsService"
import type { ITransactionsService, GetTransactionsParams, CreateTransactionRequest, UpdateTransactionRequest, PaginatedTransactions } from "@/features/offline/interfaces/ITransactionsService"
import type { TransactionDto } from "@/types"

export class OnlineTransactionsService implements ITransactionsService {
  async getTransactions(params?: GetTransactionsParams): Promise<PaginatedTransactions> {
    return transactionsService.getTransactions(params)
  }

  async getTransaction(transactionId: string): Promise<TransactionDto> {
    return transactionsService.getTransaction(transactionId)
  }

  async createTransaction(req: CreateTransactionRequest): Promise<TransactionDto> {
    return transactionsService.createTransaction(req)
  }

  async updateTransaction(transactionId: string, req: UpdateTransactionRequest): Promise<TransactionDto> {
    return transactionsService.updateTransaction(transactionId, req)
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    return transactionsService.deleteTransaction(transactionId)
  }
}