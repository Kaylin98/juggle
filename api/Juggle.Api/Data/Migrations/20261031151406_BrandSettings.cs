using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BrandSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DepartmentLabel",
                table: "Organisations",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Department");

            migrationBuilder.AddColumn<int>(
                name: "FinancialYearStartMonth",
                table: "Organisations",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<string>(
                name: "JobCodePrefix",
                table: "Departments",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DepartmentLabel",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "FinancialYearStartMonth",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "JobCodePrefix",
                table: "Departments");
        }
    }
}
