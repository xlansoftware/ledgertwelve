// types/model.ts

// ---------- Enums and common types ----------

export type BookStatus = 'open' | 'closed';

// Permissions
export type SharePermission = 'view' | 'edit';

// ---------- User ----------

export interface User {
  id: string;                  // UUID
  email: string;
  passwordHash: string;        // stored server-side, never exposed to client
  createdAt: Date;
}

// ---------- Category ----------
// Categories are global per user – owned by a specific user.
// Transactions reference the category **by value** (name string) to keep history.

export interface Category {
  id: string;
  userId: string;              // owner of the category
  name: string;                // unique per user
  recurring: boolean;          // marks recurring patterns for reports
  color: string;               // RGB string e.g. "#FF5733"
  icon: string;                // key for UI icon
  createdAt: Date;
  order?: number;              // the UI order the categories by this field
}

// ---------- Book ----------

export interface SharedUser {
  userId: string;
  permission: SharePermission;
}

export interface Book {
  id: string;
  name: string;                // "Main", "Vacation 2026", etc.
  currency?: string;           // ISO 4217 currency code, e.g. "EUR"
  status: BookStatus;
  ownerId: string;             // user who created the book
  sharedWith: SharedUser[];    // users the book is shared with (empty for private)
  createdAt: Date;
  closedAt?: Date;
}

// ---------- Transaction ----------

export interface Transaction {
  id: string;
  bookId: string;              // which book this transaction belongs to
  userId: string;              // who recorded the transaction (creator)

  // Core financial data
  dateTime: Date;              // when the transaction occurred
  amount: number;              // value in the book's base currency (can be positive/negative)

  // Optional multi‑currency support
  originalCurrency?: string;   // e.g. "USD" if different from book currency
  originalAmount?: number;     // amount in the original currency
  exchangeRate?: number;       // user‑provided rate (base/original or original/base – app convention)

  // Category – stored by value (the category name at the time of creation)
  categoryName?: string;        // references the category’s name, not its ID

  note?: string;                // free‑text memo (e.g. "Close Vacation 2026")

  // Metadata
  createdAt: Date;
  isBookClosingEntry?: boolean;
  closedBookId?: string;
}