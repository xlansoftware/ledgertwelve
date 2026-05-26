using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ledger12.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionBookField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Book",
                table: "Transactions",
                type: "TEXT",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Book",
                table: "Transactions");
        }
    }
}
