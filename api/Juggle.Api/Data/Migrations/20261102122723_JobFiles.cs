using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JobFiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Url",
                table: "JobArtwork",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddColumn<Guid>(
                name: "FileId",
                table: "JobArtwork",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "JobFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobFiles_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobFiles_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobFiles_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobArtwork_FileId",
                table: "JobArtwork",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_JobFiles_JobId",
                table: "JobFiles",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_JobFiles_OrgId",
                table: "JobFiles",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_JobFiles_UploadedByUserId",
                table: "JobFiles",
                column: "UploadedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobArtwork_JobFiles_FileId",
                table: "JobArtwork",
                column: "FileId",
                principalTable: "JobFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobArtwork_JobFiles_FileId",
                table: "JobArtwork");

            migrationBuilder.DropTable(
                name: "JobFiles");

            migrationBuilder.DropIndex(
                name: "IX_JobArtwork_FileId",
                table: "JobArtwork");

            migrationBuilder.DropColumn(
                name: "FileId",
                table: "JobArtwork");

            migrationBuilder.AlterColumn<string>(
                name: "Url",
                table: "JobArtwork",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);
        }
    }
}
