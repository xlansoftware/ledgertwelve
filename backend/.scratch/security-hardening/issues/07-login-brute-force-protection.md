# 07 — Add login brute-force protection

**What to build:** Repeated failed login attempts are throttled and lead to account lockout, and the login endpoint is rate limited per client. Successful logins and lockout recovery behave normally, and error responses remain generic so they do not reveal whether an account exists.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Exceeding a failed-attempt threshold locks the account for a defined period.
- [ ] Login requests are rate limited, returning `429` when the limit is exceeded.
- [ ] A correct password after the lockout window succeeds.
- [ ] Failure responses stay indistinguishable between unknown email and wrong password.
- [ ] Unit/integration tests cover lockout and rate-limit behaviour.
