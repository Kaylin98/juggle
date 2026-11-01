using Juggle.Api.Auth;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Data;

public class JuggleDbContext(DbContextOptions<JuggleDbContext> options, CurrentUser currentUser) : DbContext(options)
{
    // Read by the global query filters on every query; Guid.Empty (signed out) matches nothing.
    private Guid OrgId => currentUser.OrgId;

    public DbSet<Organisation> Organisations => Set<Organisation>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<TeamMembership> TeamMemberships => Set<TeamMembership>();
    public DbSet<Person> People => Set<Person>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<DepartmentManager> DepartmentManagers => Set<DepartmentManager>();
    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();
    public DbSet<JobStatus> JobStatuses => Set<JobStatus>();
    public DbSet<WorkflowTransition> WorkflowTransitions => Set<WorkflowTransition>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobEvent> JobEvents => Set<JobEvent>();
    public DbSet<Allocation> Allocations => Set<Allocation>();
    public DbSet<TimeOff> TimeOff => Set<TimeOff>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(32);
        configurationBuilder.Properties<string>().HaveMaxLength(200);
        configurationBuilder.Properties<decimal>().HavePrecision(6, 2);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organisation>(e =>
        {
            e.HasQueryFilter(o => o.Id == OrgId);
            e.Property(o => o.DepartmentLabel).HasMaxLength(32);
            e.Property(o => o.BriefLabel).HasMaxLength(32);
            e.Property(o => o.JobLabel).HasMaxLength(32);
            e.Property(o => o.JobCodeFormat).HasMaxLength(100);
            e.Property(o => o.HolidayCountry).HasMaxLength(2);
        });
        modelBuilder.Entity<Role>(e =>
        {
            e.HasQueryFilter(r => r.OrgId == OrgId);
            e.Property(r => r.Name).HasMaxLength(64);
            e.PrimitiveCollection(r => r.Capabilities).ElementType().HasConversion<string>();
        });
        modelBuilder.Entity<Team>().HasQueryFilter(t => t.OrgId == OrgId);
        modelBuilder.Entity<Person>().HasQueryFilter(p => p.OrgId == OrgId);
        modelBuilder.Entity<Department>(e =>
        {
            e.HasQueryFilter(d => d.OrgId == OrgId);
            e.Property(d => d.JobCodePrefix).HasMaxLength(10);
        });
        modelBuilder.Entity<Allocation>().HasQueryFilter(a => a.OrgId == OrgId);
        modelBuilder.Entity<TimeOff>().HasQueryFilter(t => t.OrgId == OrgId);

        modelBuilder.Entity<User>(e =>
        {
            e.HasQueryFilter(u => u.OrgId == OrgId);
            e.HasIndex(u => u.Email).IsUnique();
            // A role in use cannot be deleted.
            e.HasOne(u => u.Role).WithMany().HasForeignKey(u => u.RoleId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TeamMembership>(e =>
        {
            e.HasKey(m => new { m.UserId, m.TeamId });
            e.HasQueryFilter(m => m.OrgId == OrgId);
        });

        modelBuilder.Entity<DepartmentManager>(e =>
        {
            e.HasKey(m => new { m.UserId, m.DepartmentId });
            e.HasQueryFilter(m => m.OrgId == OrgId);
            e.HasOne(m => m.User).WithMany(u => u.ManagedDepartments).HasForeignKey(m => m.UserId);
        });

        modelBuilder.Entity<Person>().HasIndex(p => p.UserId).IsUnique();

        modelBuilder.Entity<BoardColumn>(e =>
        {
            e.HasQueryFilter(c => c.OrgId == OrgId);
            e.Property(c => c.Name).HasMaxLength(64);
        });

        // Statuses and steps in use cannot be deleted; an organisation changes its workflow around them.
        modelBuilder.Entity<JobStatus>(e =>
        {
            e.HasQueryFilter(s => s.OrgId == OrgId);
            e.Property(s => s.Name).HasMaxLength(64);
            e.Property(s => s.Colour).HasMaxLength(7);
            e.HasOne(s => s.Column).WithMany().HasForeignKey(s => s.ColumnId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkflowTransition>(e =>
        {
            e.HasQueryFilter(t => t.OrgId == OrgId);
            e.HasOne<JobStatus>().WithMany().HasForeignKey(t => t.FromStatusId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<JobStatus>().WithMany().HasForeignKey(t => t.ToStatusId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Job>(e =>
        {
            e.HasQueryFilter(j => j.OrgId == OrgId);
            e.Property(j => j.Code).HasMaxLength(300);
            e.HasIndex(j => new { j.OrgId, j.Code }).IsUnique();
            // Guards the counter: a brand never gives the same number twice (D71).
            e.HasIndex(j => new { j.DepartmentId, j.Number }).IsUnique();
            e.Property(j => j.MainGoal).HasMaxLength(2000);
            e.Property(j => j.Deliverables).HasMaxLength(4000);
            e.HasOne(j => j.Requester).WithMany().HasForeignKey(j => j.RequesterUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(j => j.Status).WithMany().HasForeignKey(j => j.StatusId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(j => j.Designer).WithMany().HasForeignKey(j => j.DesignerPersonId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(j => j.ClosedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<JobEvent>(e =>
        {
            e.HasQueryFilter(j => j.OrgId == OrgId);
            e.Property(j => j.Message).HasMaxLength(2000);
            e.HasIndex(j => new { j.JobId, j.At });
            e.HasOne<Job>().WithMany().HasForeignKey(j => j.JobId);
            e.HasOne<User>().WithMany().HasForeignKey(j => j.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<JobStatus>().WithMany().HasForeignKey(j => j.FromStatusId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<JobStatus>().WithMany().HasForeignKey(j => j.ToStatusId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TimeOff>(e =>
        {
            e.Property(t => t.Note).HasMaxLength(500);
            e.Property(t => t.DeclineReason).HasMaxLength(500);
            e.HasOne<Person>().WithMany().HasForeignKey(t => t.PersonId);
        });

        foreach (var entity in modelBuilder.Model.GetEntityTypes().Where(t => t.ClrType != typeof(Organisation)).ToList())
        {
            modelBuilder.Entity(entity.ClrType).HasOne(typeof(Organisation)).WithMany().HasForeignKey("OrgId");
        }
    }
}
