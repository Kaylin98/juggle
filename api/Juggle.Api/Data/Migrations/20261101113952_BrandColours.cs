using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BrandColours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Colour",
                table: "Departments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "#7b8ea8");

            // A brand takes the colour of one of its projects; slate blue when it has none.
            migrationBuilder.Sql(
                """
                UPDATE "Departments" d SET "Colour" = p."Colour"
                FROM (SELECT DISTINCT ON ("DepartmentId") "DepartmentId", "Colour" FROM "Projects" ORDER BY "DepartmentId", "Id") p
                WHERE p."DepartmentId" = d."Id";
                """);

            migrationBuilder.DropColumn(
                name: "Colour",
                table: "Projects");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Colour",
                table: "Projects",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "#7b8ea8");

            migrationBuilder.Sql(
                """UPDATE "Projects" p SET "Colour" = d."Colour" FROM "Departments" d WHERE d."Id" = p."DepartmentId";""");

            migrationBuilder.DropColumn(
                name: "Colour",
                table: "Departments");
        }
    }
}
