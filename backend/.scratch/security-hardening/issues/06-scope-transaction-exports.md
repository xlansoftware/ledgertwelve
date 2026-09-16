# 06 — Require and scope the book for transaction exports

**What to build:** A transaction export requested without a `bookId` is rejected with a validation error, matching the documented contract. Any transaction export that is generated is limited to books the caller can see, so no export can contain another user's data. Derived download filenames are sanitised so user-controlled book names cannot influence the written path.

**Blocked by:** 03 — Consolidate export generation into one user-scoped path.

**Status:** done

- [ ] `POST /api/v1/exports` with `contentType: "transactions"` and no `bookId` returns a validation error and creates no job.
- [ ] A transaction export for a book the caller cannot see fails without exposing data.
- [ ] A valid transaction export contains only that book's transactions.
- [ ] Book-name-derived filenames cannot escape the export directory.
- [ ] `API.md` remains accurate about the `bookId` requirement.
