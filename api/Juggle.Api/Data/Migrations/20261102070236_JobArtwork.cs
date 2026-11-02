using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JobArtwork : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobArtwork",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobArtwork", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobArtwork_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobArtwork_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobArtwork_Users_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobArtwork_JobId_Version",
                table: "JobArtwork",
                columns: new[] { "JobId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobArtwork_OrgId",
                table: "JobArtwork",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_JobArtwork_SubmittedByUserId",
                table: "JobArtwork",
                column: "SubmittedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobArtwork");
        }
    }
}
