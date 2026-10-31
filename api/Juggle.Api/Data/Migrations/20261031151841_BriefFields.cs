using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BriefFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "Requests");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Requests",
                newName: "MainGoal");

            migrationBuilder.AlterColumn<string>(
                name: "MainGoal",
                table: "Requests",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(4000)",
                oldMaxLength: 4000,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deliverables",
                table: "Requests",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MarketingManagerUserId",
                table: "Requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Requests_MarketingManagerUserId",
                table: "Requests",
                column: "MarketingManagerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_Users_MarketingManagerUserId",
                table: "Requests",
                column: "MarketingManagerUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Users_MarketingManagerUserId",
                table: "Requests");

            migrationBuilder.DropIndex(
                name: "IX_Requests_MarketingManagerUserId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "MarketingManagerUserId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "Deliverables",
                table: "Requests");

            migrationBuilder.AlterColumn<string>(
                name: "MainGoal",
                table: "Requests",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.RenameColumn(
                name: "MainGoal",
                table: "Requests",
                newName: "Description");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Requests",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Other");
        }
    }
}
