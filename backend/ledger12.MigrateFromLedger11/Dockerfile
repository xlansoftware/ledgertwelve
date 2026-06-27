# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ledger12.slnx .
COPY ledger12.MigrateFromLedger11/ledger12.MigrateFromLedger11.csproj ledger12.MigrateFromLedger11/
COPY ledger12.Infrastructure/ledger12.Infrastructure.csproj ledger12.Infrastructure/
COPY ledger12.Application/ledger12.Application.csproj ledger12.Application/
COPY ledger12.Domain/ledger12.Domain.csproj ledger12.Domain/

RUN dotnet restore ledger12.MigrateFromLedger11/ledger12.MigrateFromLedger11.csproj

COPY . .
RUN dotnet publish ledger12.MigrateFromLedger11/ledger12.MigrateFromLedger11.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ledger12.MigrateFromLedger11.dll"]
