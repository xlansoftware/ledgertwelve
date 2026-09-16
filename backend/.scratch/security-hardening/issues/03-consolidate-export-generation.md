# 03 — Consolidate export generation into one user-scoped path (prefactor)

**What to build:** Exactly one export-generation implementation is used by the export background processor. The duplicate implementation that bypasses user scoping is removed, and the surviving path enforces the caller's visibility for every export content type. All existing export kinds (categories, transactions, books, reports, backup) still produce their files and download successfully.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] A transaction/category/book/report/backup export requested through the API completes and downloads.
- [ ] Only one export-generation code path exists; the unused duplicate is deleted.
- [ ] The surviving path's transaction query is scoped to books visible to the job owner (no global table scan).
- [ ] Existing export tests pass against the consolidated path.
