using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RequestLoggedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            // Existing requests were logged by their requesters.
            migrationBuilder.AddColumn<Guid>(
                name: "LoggedByUserId",
                table: "Requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""UPDATE "Requests" SET "LoggedByUserId" = "RequesterUserId";""");

            migrationBuilder.AlterColumn<Guid>(
                name: "LoggedByUserId",
                table: "Requests",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Users_LoggedByUserId",
                table: "Requests");

            migrationBuilder.DropIndex(
                name: "IX_Requests_LoggedByUserId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "LoggedByUserId",
                table: "Requests");

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
    }
}
