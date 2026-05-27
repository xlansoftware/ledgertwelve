using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ledger12.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionNotesField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Transactions",
                type: "TEXT",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Transactions");
        }
    }
}
