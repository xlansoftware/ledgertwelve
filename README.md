# Ledger12

A personal financial ledger application — the next generation after Ledger11.

## Docker deployment

### Prerequisites

- Docker and Docker Compose v2.5+
- A `.env` file or environment variables for secrets (if any)

### Start the stack (normal, no migration)

```bash
docker compose up -d
```

This starts:
- **nginx** on port 3000 (reverse proxy to the API)
- **webapi** on port 5000 (ASP.NET Core backend with SQLite)

### Start with Ledger11 migration

If you have an existing Ledger11 data folder, place it at `./ledger11data` relative to this file. The folder must contain:
- `appdata.db` — the main Ledger11 database
- `space-*.db` files — per-space databases

Then run:

```bash
# Step 1: Migrate Ledger11 data into Ledger12
docker compose --profile migration run --rm migration-job

# Step 2: Start the stack
docker compose up -d
```

The migration job:
1. Drops any existing Ledger12 database (clean start).
2. Creates a fresh schema.
3. Imports users, books, shares, categories, transactions, and preferences.
4. Exits. The container is removed after completion.

> ⚠️ The migration is destructive — it replaces the entire database. Run it only once on initial deployment.

### Start without migration (e.g., on restart)

```bash
docker compose up -d
```

The `migration` service uses a Docker Compose **profile** (`migration`). It is **not** started by default — only when `--profile migration` is passed. Normal `up` starts webapi and nginx directly.

### Volumes

| Volume | Purpose |
|---|---|
| `ledger12data` | SQLite database file (`/data/ledger12.db`), shared between migration-job and webapi |
| `./ledger11data` (bind mount) | Ledger11 data folder, mounted at `/ledger11data` in the migration container only |

### Troubleshooting

- **Migration fails**: Check the logs with `docker compose --profile migration logs migration-job`. Fix any data issues and re-run the migration. The database is left in a clean (empty) state after a failed migration.
- **"Data directory not found"**: Ensure `./ledger11data` exists and contains `appdata.db`.
- **"appdata.db not found"**: The ledger11 folder must have the main database file at its root.