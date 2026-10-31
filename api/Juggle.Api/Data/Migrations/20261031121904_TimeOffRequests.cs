using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juggle.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TimeOffRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeclineReason",
                table: "TimeOff",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "TimeOff",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeclineReason",
                table: "TimeOff");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "TimeOff");
        }
    }
}
