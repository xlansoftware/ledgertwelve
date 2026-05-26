```bash
# install tools
dotnet tool install --global dotnet-aspnet-codegenerator
dotnet tool install --global dotnet-ef

# use the tools
dotnet aspnet-codegenerator identity -h
dotnet aspnet-codegenerator identity --dbContext AppDbContext --userClass AppUser -dbProvider sqlite
```

```bash
dotnet ef migrations add {MIGRATION NAME}
dotnet ef database update
```

```bash
# create migration
# cd project root folder
dotnet ef migrations add InitialCreate \
  --project backend/ledger12.Infrastructure/ledger12.Infrastructure.csproj \
  --startup-project backend/ledger12.API/ledger12.API.csproj \
  --output-dir Data/Migrations
```