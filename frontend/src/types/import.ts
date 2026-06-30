// ---------------------------------------------------------------------------
// Import domain types — backup data formats
// Separate from dto.ts to allow future backup versions (v2, v3, …)
// without touching the API DTO layer.
// ---------------------------------------------------------------------------

import type { BookDto, CategoryDto, TransactionDto } from "./dto"

export interface BackupData_v1 {
  version: 1
  books: BookDto[]
  categories: CategoryDto[]
  transactions: TransactionDto[]
}

export type BackupData = BackupData_v1
