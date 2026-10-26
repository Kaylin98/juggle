# Juggle

Resource planning and work intake for in-house teams: who is busy, who is free and what is waiting, for any department. Currently building the demo described in `docs/demo-brief.md`.

## Coding standards

Simple and maintainable: no speculative abstractions, but clear structure that holds up after the demo.

**Principles**

1. Use the latest stable versions of libraries and idiomatic approaches as of today
2. Keep it simple. NEVER over-engineer, ALWAYS simplify. No speculative abstractions, no features outside this brief
3. Simple does not mean messy: clear names, small focused classes and components, one responsibility each
4. No unnecessary defensive programming. Validate at the boundaries (API input, external calls) and trust the code inside
5. Be concise. Keep the README minimal. IMPORTANT: no emojis ever
6. When hitting issues, identify the root cause before trying a fix. Do not guess. Prove it with evidence, then fix the root cause

**Backend (.NET)**

- Organise by feature (e.g. `Features/Tasks`, `Features/Allocations`), not by technical layer
- Controllers stay thin: validate input, call a service, return a DTO
- Never return EF entities from the API; map to DTOs
- Async all the way down; no `.Result` or `.Wait()`
- Enforce `OrgId` with EF Core global query filters and team access checks on the server, never in the UI only
- `DateOnly` for dates; no business logic in migrations
- Configuration through `appsettings` and environment variables; no secrets in the repo
- Built-in dependency injection, `ILogger` and ProblemDetails for errors

**Frontend (Angular)**

- Standalone components, signals for state, the new control flow (`@if`, `@for`)
- Organise by feature (e.g. `features/board`, `features/capacity`), with shared UI in `shared/`
- Components handle display; data access lives in services
- Strongly typed models that match the API DTOs; no `any`
- Tailwind for styling; no inline styles, and component CSS only when Tailwind can't do it

**Data and API**

- REST endpoints per resource with clear status codes (200, 201, 204, 400, 401, 403, 404)
- Every schema change goes through an EF Core migration
- Seed data lives in one idempotent seeder

**Definition of done for a milestone**

- Builds with no warnings and passes lint
- Smoke tests pass; add a test when fixing a bug
- Acceptance criteria for that milestone are met and ticked in plan.md
- Committed with a clear message describing what changed

## Working documentation

- `docs/demo-brief.md`: source of truth for scope, data model, acceptance criteria and the demo script
- `docs/plan.md`: phases, task checklists, decisions and the current position
- At the start of every session, read the "Where we left off" block at the top of `docs/plan.md`
- Tick tasks in `docs/plan.md` as they are finished; update "Where we left off", the phase status and the progress log at the end of every session or phase
- Work one phase at a time. **At the end of every phase, stop for human review.** Do not start the next phase until the user approves it
- Ideas outside the brief go in the "Later" list in `docs/plan.md`, not into the code
- Ask before adding any paid library
