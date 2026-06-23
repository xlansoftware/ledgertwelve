// ---------------------------------------------------------------------------
// ServiceFactory — holds all per-domain service instances.
// Created at app bootstrap based on the active mode (online/offline).
// ---------------------------------------------------------------------------

import type { IBooksService } from "@/features/offline/interfaces/IBooksService"
import type { ICategoriesService } from "@/features/offline/interfaces/ICategoriesService"
import type { ITransactionsService } from "@/features/offline/interfaces/ITransactionsService"
import type { IReportsService } from "@/features/offline/interfaces/IReportsService"
import type { IUsersService } from "@/features/offline/interfaces/IUsersService"

import { OnlineBooksService } from "@/features/offline/online/OnlineBooksService"
import { OnlineCategoriesService } from "@/features/offline/online/OnlineCategoriesService"
import { OnlineTransactionsService } from "@/features/offline/online/OnlineTransactionsService"
import { OnlineReportsService } from "@/features/offline/online/OnlineReportsService"
import { OnlineUsersService } from "@/features/offline/online/OnlineUsersService"

import { OfflineBooksService } from "@/features/offline/offline/OfflineBooksService"
import { OfflineCategoriesService } from "@/features/offline/offline/OfflineCategoriesService"
import { OfflineTransactionsService } from "@/features/offline/offline/OfflineTransactionsService"
import { OfflineReportsService } from "@/features/offline/offline/OfflineReportsService"
import { OfflineUsersService } from "@/features/offline/offline/OfflineUsersService"
import { OfflineUserStore } from "@/features/offline/offline/OfflineUserStore"
import * as db from "@/features/offline/offline/db"
import type { BookDto, CategoryDto } from "@/types"

// ---------------------------------------------------------------------------
// ServiceFactory type
// ---------------------------------------------------------------------------

export interface ServiceFactory {
  books: IBooksService
  categories: ICategoriesService
  transactions: ITransactionsService
  reports: IReportsService
  users: IUsersService
}

// ---------------------------------------------------------------------------
// Singleton holder
// ---------------------------------------------------------------------------

let currentFactory: ServiceFactory | null = null

/**
 * Set the active service factory. Called once during app bootstrap.
 */
export function setFactory(factory: ServiceFactory): void {
  currentFactory = factory
}

/**
 * Get the active service factory.
 * Auto-initializes with an online factory if not yet set.
 * This allows tests and modules imported early to work without explicit setup.
 */
export function getFactory(): ServiceFactory {
  if (!currentFactory) {
    currentFactory = createOnlineFactory()
  }
  return currentFactory
}

/**
 * Create an online factory that delegates to the existing API-based services.
 */
export function createOnlineFactory(): ServiceFactory {
  const factory: ServiceFactory = {
    books: new OnlineBooksService(),
    categories: new OnlineCategoriesService(),
    transactions: new OnlineTransactionsService(),
    reports: new OnlineReportsService(),
    users: new OnlineUsersService(),
  }
  return factory
}

/**
 * Create an offline factory backed by IndexedDB.
 *
 * Two-phase construction: services that need the factory for cross-service
 * workflows (closeBook → createTransaction) use getFactory() internally
 * rather than constructor injection, so there is no circular dependency
 * at construction time.
 */
export function createOfflineFactory(): ServiceFactory {
  const userStore = new OfflineUserStore()

  const factory: ServiceFactory = {
    books: new OfflineBooksService(userStore),
    categories: new OfflineCategoriesService(),
    transactions: new OfflineTransactionsService(userStore),
    reports: new OfflineReportsService(),
    users: new OfflineUsersService(userStore),
  }

  // Register the factory so that offline services can access it via getFactory()
  setFactory(factory)

  return factory
}

/**
 * Seed default data into IndexedDB for offline mode.
 * Creates the Main book (id="book_main") and default categories
 * matching the mock data if the database is empty.
 */
export async function seedOfflineData(): Promise<void> {
  // Seed Main book if none exist
  const existingBooks = await db.getAll<BookDto>(db.STORES.books)
  if (existingBooks.length === 0) {
    const now = new Date().toISOString()
    const mainBook: BookDto = {
      id: "book_main",
      name: "Main",
      currency: "EUR",
      status: "open",
      ownerId: "",
      sharedWith: [],
      createdAt: now,
    }
    await db.put(db.STORES.books, mainBook)
  }

  // Seed default categories if none exist
  const existingCategories = await db.getAll<CategoryDto>(db.STORES.categories)
  if (existingCategories.length === 0) {
    const now = new Date().toISOString()
    const defaultCategories: CategoryDto[] = [
      { id: "cat_1",  name: "Groceries",       recurring: false, color: "#fde68a", icon: "shopping-cart",   createdAt: now, order: 1 },
      { id: "cat_2",  name: "Pets",            recurring: false, color: "#4d22b2", icon: "heart",          createdAt: now, order: 2 },
      { id: "cat_3",  name: "Maintenance",     recurring: true,  color: "#ad3e00", icon: "home",           createdAt: now, order: 3 },
      { id: "cat_4",  name: "Utilities",       recurring: true,  color: "#a5b4fc", icon: "plug",           createdAt: now, order: 4 },
      { id: "cat_5",  name: "Dining Out",      recurring: false, color: "#FFCAD4", icon: "utensils",       createdAt: now, order: 5 },
      { id: "cat_6",  name: "Transportation",  recurring: false, color: "#bbf7d0", icon: "car",            createdAt: now, order: 6 },
      { id: "cat_7",  name: "Sport",           recurring: false, color: "#F72585", icon: "smile",          createdAt: now, order: 7 },
      { id: "cat_8",  name: "Entertainment",   recurring: false, color: "#bae6fd", icon: "film",           createdAt: now, order: 8 },
      { id: "cat_9",  name: "Miscellaneous",   recurring: false, color: "#FDFFB6", icon: "dots-horizontal", createdAt: now, order: 9 },
      { id: "cat_10", name: "Health / Medical", recurring: false, color: "#FF595E", icon: "heart",          createdAt: now, order: 10 },
      { id: "cat_11", name: "Personal Care",   recurring: false, color: "#ddd6fe", icon: "smile",          createdAt: now, order: 11 },
      { id: "cat_12", name: "Clothing",        recurring: false, color: "#e0f2fe", icon: "shirt",          createdAt: now, order: 12 },
      { id: "cat_13", name: "Travel",          recurring: false, color: "#a7f3d0", icon: "plane",          createdAt: now, order: 13 },
      { id: "cat_14", name: "Gifts",           recurring: false, color: "#d9f99d", icon: "gift",           createdAt: now, order: 14 },
      { id: "cat_15", name: "Education",       recurring: false, color: "#fef9c3", icon: "book",           createdAt: now, order: 15 },
      { id: "cat_16", name: "Parents",         recurring: false, color: "#3A86FF", icon: "file",           createdAt: now, order: 16 },
      { id: "cat_17", name: "Insurance",       recurring: true,  color: "#fcd34d", icon: "shield",         createdAt: now, order: 17 },
      { id: "cat_18", name: "Savings",         recurring: false, color: "#f0abfc", icon: "piggy-bank",     createdAt: now, order: 18 },
      { id: "cat_19", name: "Taxes",           recurring: true,  color: "#e22400", icon: "edit",           createdAt: now, order: 19 },
      { id: "cat_20", name: "Subscriptions",   recurring: true,  color: "#fde2e4", icon: "credit-card",    createdAt: now, order: 20 },
      { id: "cat_21", name: "Rent / Mortgage", recurring: true,  color: "#fca5a5", icon: "home",           createdAt: now, order: 21 },
      { id: "cat_22", name: "Kids",            recurring: false, color: "#FF6B6B", icon: "piggy-bank",     createdAt: now, order: 22 },
    ]

    for (const cat of defaultCategories) {
      await db.put(db.STORES.categories, cat)
    }
  }
}

/**
 * Check whether the app is running in offline mode.
 */
export function isOfflineMode(): boolean {
  return localStorage.getItem("ledger12.mode") === "offline"
}

/**
 * Check whether the app is running in online mode (default).
 */
export function isOnlineMode(): boolean {
  return localStorage.getItem("ledger12.mode") !== "offline"
}