using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ledger12.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionValueInBookCurrencyField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ValueInBookCurrency",
                table: "Transactions",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValueInBookCurrency",
                table: "Transactions");
        }
    }
}
