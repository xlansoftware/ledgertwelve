### Usage

```bash
# From solution root:
dotnet run --project ledger12.MigrateFromLedger11

# With custom paths:
dotnet run --project ledger12.MigrateFromLedger11 -- \
  --data-dir "./ledger11data" \
  --connection-string "Data Source=./data/ledger12.API.db"
``` 