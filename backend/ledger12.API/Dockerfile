# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ledger12.slnx .
COPY ledger12.API/ledger12.API.csproj ledger12.API/
COPY ledger12.Application/ledger12.Application.csproj ledger12.Application/
COPY ledger12.Domain/ledger12.Domain.csproj ledger12.Domain/
COPY ledger12.Infrastructure/ledger12.Infrastructure.csproj ledger12.Infrastructure/
COPY ledger12.Tests/ledger12.Tests.csproj ledger12.Tests/
COPY ledger12.MigrateFromLedger11/ledger12.MigrateFromLedger11.csproj ledger12.MigrateFromLedger11/

RUN dotnet restore

COPY . .
RUN dotnet publish ledger12.API/ledger12.API.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ledger12.API.dll"]