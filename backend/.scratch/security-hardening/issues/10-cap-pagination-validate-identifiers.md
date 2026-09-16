# 10 — Cap pagination, validate identifiers, stop email enumeration

**What to build:** Transaction search enforces an upper bound on `pageSize`, a malformed `bookId` on `PUT /api/v1/books/current` returns a `400` instead of a `500`, and registration/share flows no longer reveal whether an email address is already registered. `API.md` documents the pagination cap.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `pageSize` above the cap is clamped or rejected with a clear validation error.
- [ ] A non-GUID `bookId` on the current-book endpoint returns `400`.
- [ ] Registration no longer discloses that an email is already in use.
- [ ] Share endpoints do not distinguish "user not found" from a generic failure that reveals account existence.
- [ ] `API.md` documents the maximum page size.
