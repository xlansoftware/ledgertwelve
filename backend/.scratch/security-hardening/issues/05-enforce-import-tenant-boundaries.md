# 05 — Enforce tenant boundaries across all import paths

**What to build:** Every imported row is authorised against the data it actually touches. A row-level `bookId` cannot inject a transaction into a book the caller cannot edit, an upsert by `id` cannot modify a transaction the caller cannot edit, and backup restore requires edit access (not merely view access) to each target book. `API.md` reflects these rules.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Importing a transaction with a row-level `bookId` the caller cannot edit is rejected and reported as a row issue, with nothing written.
- [ ] Upserting an existing transaction the caller cannot edit is rejected and leaves the row unchanged.
- [ ] Backup restore into a view-only shared book is rejected.
- [ ] Valid imports into the caller's own/editable books still succeed.
- [ ] `API.md` documents that all import targets require edit access.
- [ ] Integration tests cover cross-tenant insert and cross-tenant upsert attempts.
