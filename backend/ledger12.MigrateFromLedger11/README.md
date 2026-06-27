### Usage (development)

```bash
# From solution root:
dotnet run --project ledger12.MigrateFromLedger11

# With custom paths:
dotnet run --project ledger12.MigrateFromLedger11 -- \
  --data-dir "./ledger11data" \
  --connection-string "Data Source=./ledger12.API/data/ledger12.API.db"
```

### Usage (Docker)

The migration tool is also packaged as a Docker image. See the root `README.md` for deployment instructions.

```bash
# Run the migration container against a local ledger11 folder
# (from the repository root)
docker compose --profile migration run --rm migration
```

### Connection string resolution order

1. `--connection-string` CLI argument
2. `ConnectionStrings__AppDbContextConnection` environment variable (Docker convention)
3. API project's `appsettings.json` (file lookup, for development)
4. Default: `Data Source=./data/ledger12.API.db` 