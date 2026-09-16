# 04 — Scope transaction search to the caller's visible books

**What to build:** `GET /api/v1/transactions` only ever returns transactions in books the authenticated caller can see, whether or not `bookId` is supplied. Filters such as `createdBy`, `note`, `category`, and date ranges cannot reach across tenants, and pagination totals reflect the same scoped set. `API.md` documents the scoping guarantee.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A search omitting `bookId` returns only the caller's own or shared-book transactions.
- [ ] Supplying another user's `bookId` yields no data (not found), unchanged from today.
- [ ] `meta.total` matches the scoped result set.
- [ ] `API.md` states that results are always limited to visible books.
- [ ] Integration test proves two users cannot see each other's transactions via an unscoped search.
