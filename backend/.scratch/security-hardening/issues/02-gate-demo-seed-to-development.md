# 02 — Gate the seeded demo account to Development

**What to build:** The hardcoded demo account (`demo@example.com`) is only created when the app runs in the Development environment. In any other environment no well-known credential is seeded, so a production deployment cannot be accessed with a publicly known password.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Seeding the demo user is skipped outside Development.
- [ ] Development startup still produces the demo user with its existing defaults.
- [ ] A test covers that seeding is a no-op when the environment is not Development.
