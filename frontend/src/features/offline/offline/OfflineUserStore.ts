// ---------------------------------------------------------------------------
// OfflineUserStore — manages the single local user identity for offline mode.
// A UUID is generated via crypto.randomUUID() on first launch and persisted
// in localStorage.
// ---------------------------------------------------------------------------

import type { UserSummary } from "@/types"

const LOCAL_USER_KEY = "ledger12.localUserId"

function generateId(): string {
  return crypto.randomUUID()
}

function loadOrCreateUserId(): string {
  const stored = localStorage.getItem(LOCAL_USER_KEY)
  if (stored) {
    return stored
  }
  const id = generateId()
  localStorage.setItem(LOCAL_USER_KEY, id)
  return id
}

export class OfflineUserStore {
  private user: UserSummary

  constructor() {
    const id = loadOrCreateUserId()
    this.user = { id, email: "local@ledger12.app" }
  }

  getUserId(): string {
    return this.user.id
  }

  getUser(): UserSummary {
    return { ...this.user }
  }

  /** For testing: reset the stored user ID. */
  static reset(): void {
    localStorage.removeItem(LOCAL_USER_KEY)
  }
}