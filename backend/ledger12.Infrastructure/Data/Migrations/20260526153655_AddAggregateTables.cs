using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ledger12.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAggregateTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyAggregates",
                columns: table => new
                {
                    PeriodStart = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Book = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Author = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Currency = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    SumValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyAggregates", x => new { x.PeriodStart, x.Book, x.Author, x.Category, x.Currency });
                });

            migrationBuilder.CreateTable(
                name: "MonthlyAggregates",
                columns: table => new
                {
                    PeriodStart = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Book = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Author = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Currency = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    SumValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyAggregates", x => new { x.PeriodStart, x.Book, x.Author, x.Category, x.Currency });
                });

            migrationBuilder.CreateTable(
                name: "WeeklyAggregates",
                columns: table => new
                {
                    PeriodStart = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Book = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Author = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Currency = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    SumValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyAggregates", x => new { x.PeriodStart, x.Book, x.Author, x.Category, x.Currency });
                });

            migrationBuilder.CreateTable(
                name: "YearlyAggregates",
                columns: table => new
                {
                    PeriodStart = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Book = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Author = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Currency = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    SumValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_YearlyAggregates", x => new { x.PeriodStart, x.Book, x.Author, x.Category, x.Currency });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyAggregates");

            migrationBuilder.DropTable(
                name: "MonthlyAggregates");

            migrationBuilder.DropTable(
                name: "WeeklyAggregates");

            migrationBuilder.DropTable(
                name: "YearlyAggregates");
        }
    }
}
