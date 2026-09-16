# 09 — Return generic client-facing errors and log details server-side

**What to build:** Import row issues and export failure messages no longer echo raw exception text (such as file paths or internal details) to API clients. The underlying detail is logged server-side instead, while the documented error shape (`{ "error": ... }`) and status codes are unchanged.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Import responses contain user-safe issue messages, not raw exception messages.
- [ ] Export status no longer returns raw internal exception text.
- [ ] Full details remain available in server logs.
- [ ] Existing error shapes and status codes are preserved.
