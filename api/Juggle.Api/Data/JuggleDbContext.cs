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
    public DbSet<WorkflowStatus> WorkflowStatuses => Set<WorkflowStatus>();
    public DbSet<Request> Requests => Set<Request>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
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
        modelBuilder.Entity<WorkflowStatus>().HasQueryFilter(s => s.OrgId == OrgId);
        modelBuilder.Entity<Project>().HasQueryFilter(p => p.OrgId == OrgId);
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

        modelBuilder.Entity<Request>(e =>
        {
            e.HasQueryFilter(r => r.OrgId == OrgId);
            e.Property(r => r.MainGoal).HasMaxLength(2000);
            e.Property(r => r.Deliverables).HasMaxLength(4000);
            e.Property(r => r.RejectionReason).HasMaxLength(1000);
            e.HasOne(r => r.Requester).WithMany().HasForeignKey(r => r.RequesterUserId);
            e.HasOne<TaskItem>().WithMany().HasForeignKey(r => r.TaskId);
        });

        modelBuilder.Entity<TaskItem>(e =>
        {
            e.ToTable("Tasks");
            e.HasQueryFilter(t => t.OrgId == OrgId);
            e.Property(t => t.Description).HasMaxLength(4000);
            e.Property(t => t.Link).HasMaxLength(1000);
            e.Property(t => t.Feedback).HasMaxLength(1000);
            e.HasOne(t => t.Assignee).WithMany().HasForeignKey(t => t.AssigneePersonId);
            e.HasOne<Team>().WithMany().HasForeignKey(t => t.TeamId);
        });

        modelBuilder.Entity<Project>().HasOne<Team>().WithMany().HasForeignKey(p => p.TeamId);
        modelBuilder.Entity<Allocation>().HasOne<TaskItem>().WithMany().HasForeignKey(a => a.TaskId);
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
