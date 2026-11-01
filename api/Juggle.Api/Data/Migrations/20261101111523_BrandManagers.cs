using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BrandManagers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DepartmentManagers",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentManagers", x => new { x.UserId, x.DepartmentId });
                    table.ForeignKey(
                        name: "FK_DepartmentManagers_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentManagers_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentManagers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentManagers_DepartmentId",
                table: "DepartmentManagers",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentManagers_OrgId",
                table: "DepartmentManagers",
                column: "OrgId");

            // A user's one department becomes the brand they manage.
            migrationBuilder.Sql(
                """
                INSERT INTO "DepartmentManagers" ("UserId", "DepartmentId", "OrgId")
                SELECT "Id", "DepartmentId", "OrgId" FROM "Users" WHERE "DepartmentId" IS NOT NULL;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Users_LoggedByUserId",
                table: "Requests");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_DepartmentId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Requests_LoggedByUserId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LoggedByUserId",
                table: "Requests");

            migrationBuilder.AddColumn<string>(
                name: "Feedback",
                table: "Tasks",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Feedback",
                table: "Tasks");

            migrationBuilder.AddColumn<Guid>(
                name: "DepartmentId",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LoggedByUserId",
                table: "Requests",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            // Every request was logged by its requester; each manager keeps one of their brands.
            migrationBuilder.Sql("""UPDATE "Requests" SET "LoggedByUserId" = "RequesterUserId";""");
            migrationBuilder.Sql(
                """
                UPDATE "Users" u SET "DepartmentId" = (
                    SELECT m."DepartmentId" FROM "DepartmentManagers" m WHERE m."UserId" = u."Id" LIMIT 1);
                """);

            migrationBuilder.DropTable(
                name: "DepartmentManagers");

            migrationBuilder.CreateIndex(
                name: "IX_Users_DepartmentId",
                table: "Users",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_LoggedByUserId",
                table: "Requests",
                column: "LoggedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_Users_LoggedByUserId",
                table: "Requests",
                column: "LoggedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");
        }
    }
}
