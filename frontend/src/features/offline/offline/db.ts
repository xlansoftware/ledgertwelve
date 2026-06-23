// ---------------------------------------------------------------------------
// IndexedDB schema and helper — handles database creation, migration, and
// provides typed wrappers for CRUD on object stores.
//
// Database name:   "ledger12"
// Schema version:  v1
// Object stores:
//   books         — keyed by id (UUID). Stores BookDto documents.
//   categories    — keyed by id (UUID). Stores CategoryDto documents.
//   transactions  — keyed by id (UUID). Stores TransactionDto documents.
//                  Indexes: bookId (standalone), [bookId, dateTime] (compound).
//   users         — keyed by id (UUID). Stores UserSummary documents.
//   sharedUsers   — keyed by compound [bookId, userId]. Stores shared user entries.
// ---------------------------------------------------------------------------

const DB_NAME = "ledger12"
const DB_VERSION = 1

// ---- Store names ----

export const STORES = {
  books: "books",
  categories: "categories",
  transactions: "transactions",
  users: "users",
  sharedUsers: "sharedUsers",
} as const

// ---- Low-level helpers ----

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Books store
      if (!db.objectStoreNames.contains(STORES.books)) {
        db.createObjectStore(STORES.books, { keyPath: "id" })
      }

      // Categories store
      if (!db.objectStoreNames.contains(STORES.categories)) {
        db.createObjectStore(STORES.categories, { keyPath: "id" })
      }

      // Transactions store with indexes
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        const txStore = db.createObjectStore(STORES.transactions, { keyPath: "id" })
        txStore.createIndex("bookId", "bookId", { unique: false })
        txStore.createIndex("bookId_dateTime", ["bookId", "dateTime"], { unique: false })
      }

      // Users store
      if (!db.objectStoreNames.contains(STORES.users)) {
        db.createObjectStore(STORES.users, { keyPath: "id" })
      }

      // SharedUsers store — compound key [bookId, userId]
      if (!db.objectStoreNames.contains(STORES.sharedUsers)) {
        db.createObjectStore(STORES.sharedUsers, { keyPath: ["bookId", "userId"] })
      }
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

// ---- Typed CRUD helpers ----

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => {
      resolve(request.result as T[])
    }
    request.onerror = () => {
      reject(request.error)
    }
    tx.oncomplete = () => db.close()
  })
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const request = store.get(id)
    request.onsuccess = () => {
      resolve(request.result as T | undefined)
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function put<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function remove(storeName: string, id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Get all entries from a store filtered by an index value.
 */
async function getAllByIndex<T>(
  storeName: string,
  indexName: string,
  value: string | string[],
): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => {
      resolve(request.result as T[])
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Get entries from a store filtered by an index range.
 */
async function getAllByIndexRange<T>(
  storeName: string,
  indexName: string,
  range: IDBKeyRange,
): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(range)
    request.onsuccess = () => {
      resolve(request.result as T[])
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

// ---- SharedUsers specific helpers ----

interface SharedUserEntry {
  bookId: string
  userId: string
  email: string
  permission: "view" | "edit"
}

async function getAllSharedUsersForBook(bookId: string): Promise<SharedUserEntry[]> {
  const allEntries = await getAll<SharedUserEntry>(STORES.sharedUsers)
  return allEntries.filter((e) => e.bookId === bookId)
}

async function removeSharedUser(bookId: string, userId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sharedUsers, "readwrite")
    const store = tx.objectStore(STORES.sharedUsers)
    const request = store.delete([bookId, userId])
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function clearAllSharedUsersForBook(bookId: string): Promise<void> {
  const entries = await getAllSharedUsersForBook(bookId)
  for (const entry of entries) {
    await removeSharedUser(bookId, entry.userId)
  }
}

// ---- Exports ----

export {
  openDb,
  getAll,
  getById,
  put,
  remove,
  clearStore,
  getAllByIndex,
  getAllByIndexRange,
  getAllSharedUsersForBook,
  removeSharedUser,
  clearAllSharedUsersForBook,
}

export type { SharedUserEntry }