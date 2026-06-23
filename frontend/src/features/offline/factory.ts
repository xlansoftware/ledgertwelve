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