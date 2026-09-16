# 01 — Remove production debugger launch

**What to build:** A transaction import (`POST /api/v1/imports`) runs to completion without ever attempting to attach a debugger or stall the request thread. The debugger call currently embedded in the import path is removed, and a regression test guards against it returning.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] Importing transactions completes normally in a non-development environment with no debugger interaction.
- [ ] No debugger-launch call remains anywhere in the shipped code.
- [ ] A test asserts the import path does not depend on a debugger being present.
