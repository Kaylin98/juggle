using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BriefSections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Deliverables",
                table: "Jobs");

            migrationBuilder.RenameColumn(
                name: "MainGoal",
                table: "Jobs",
                newName: "Purpose");

            migrationBuilder.AddColumn<string>(
                name: "AdditionalInformation",
                table: "Jobs",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandRequirements",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Campaign",
                table: "Jobs",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Jobs",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channels",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ColoursAndTypography",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreativeDirection",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreativeInstructions",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DesignReferences",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExpectedOutcome",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KeyMessage",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LegalDisclaimers",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MandatoryMessaging",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Objective",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductImagery",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiredLogos",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RevisesJobCode",
                table: "Jobs",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetAudience",
                table: "Jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "JobDeliverables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Specifications = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobDeliverables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobDeliverables_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobDeliverables_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JobLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobLinks_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobLinks_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobDeliverables_JobId",
                table: "JobDeliverables",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_JobDeliverables_OrgId",
                table: "JobDeliverables",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_JobLinks_JobId",
                table: "JobLinks",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_JobLinks_OrgId",
                table: "JobLinks",
                column: "OrgId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobDeliverables");

            migrationBuilder.DropTable(
                name: "JobLinks");

            migrationBuilder.DropColumn(
                name: "AdditionalInformation",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "BrandRequirements",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "Campaign",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "Channels",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ColoursAndTypography",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CreativeDirection",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CreativeInstructions",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "DesignReferences",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ExpectedOutcome",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "KeyMessage",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "LegalDisclaimers",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "MandatoryMessaging",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "Objective",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ProductImagery",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "RequiredLogos",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "RevisesJobCode",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "TargetAudience",
                table: "Jobs");

            migrationBuilder.RenameColumn(
                name: "Purpose",
                table: "Jobs",
                newName: "MainGoal");

            migrationBuilder.AddColumn<string>(
                name: "Deliverables",
                table: "Jobs",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);
        }
    }
}
