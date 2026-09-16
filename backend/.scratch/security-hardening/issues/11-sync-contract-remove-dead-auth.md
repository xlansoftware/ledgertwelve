# 11 — Sync the contract and remove dead auth code

**What to build:** The registration endpoint is documented in `API.md`, and the unused GitHub OAuth extension is either wired into startup or removed, so the codebase and the authoritative contract no longer disagree about what the API offers.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `POST /api/v1/auth/register` is documented in `API.md` with its request, response, and error responses.
- [ ] The GitHub OAuth extension is either reachable from startup configuration or deleted.
- [ ] No undocumented endpoints remain relative to `API.md`.
