# 08 — Harden transport, CORS, cookies, and host filtering

**What to build:** In the deployed configuration the authentication cookie is only sent over HTTPS, the app redirects HTTP to HTTPS and advertises HSTS, cross-origin access is limited to configured origins (remaining permissive only in Development), and host filtering no longer accepts any host. Runtime behaviour matches the cookie guarantees stated in `API.md`.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] Auth cookies are issued with `Secure` in non-development environments.
- [ ] HTTP requests are redirected to HTTPS and HSTS is emitted.
- [ ] CORS allows only configured origins outside Development.
- [ ] `AllowedHosts` is restricted instead of `"*"`.
- [ ] Existing same-origin frontend flows continue to work.
