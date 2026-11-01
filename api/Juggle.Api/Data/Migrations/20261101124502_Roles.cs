using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Roles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OrgRole",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "TeamMemberships");

            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "Users",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "BriefLabel",
                table: "Organisations",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Request");

            migrationBuilder.AddColumn<string>(
                name: "HolidayCountry",
                table: "Organisations",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "ZA");

            migrationBuilder.AddColumn<string>(
                name: "JobLabel",
                table: "Organisations",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Job");

            migrationBuilder.AddColumn<decimal>(
                name: "WorkdayHours",
                table: "Organisations",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: false,
                defaultValue: 8m);

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Capabilities = table.Column<string[]>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Roles_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_OrgId",
                table: "Roles",
                column: "OrgId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users",
                column: "RoleId",
                principalTable: "Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropIndex(
                name: "IX_Users_RoleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BriefLabel",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "HolidayCountry",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "JobLabel",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "WorkdayHours",
                table: "Organisations");

            migrationBuilder.AddColumn<string>(
                name: "OrgRole",
                table: "Users",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "TeamMemberships",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");
        }
    }
}
