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

## Design

Calm, soft and easy on the eyes; nothing sharp or bright. Mood reference: `docs/design-reference.png`. All tokens live in the `@theme` block in `web/src/styles.css`, and Tailwind's default palette is cleared, so components use only these.

- **Colour:** `page` background, `surface` for cards and panels, `surface-muted` for subtle fills, `line` / `line-strong` for the few borders. Text is `ink` (navy) or `ink-muted`; `ink-faint` is for icons and placeholders only. One accent (`accent-50` to `accent-700`, calm blue) for actions, selected states, focus and today; `highlight` (amber) for small touches only. Load and status use `ok`, `warn`, `over` at 50 (tint), 500 (dot or bar) and 700 (text)
- **Project and avatar colours** come from the data and must be one of the 8 palette hues: `#5b8def` blue, `#3fa7a0` teal, `#6aa36f` sage, `#d9a441` amber, `#e07a5f` coral, `#d16b8f` rose, `#8a78d6` violet, `#7b8ea8` slate blue. Set the colour as `--hue` and use `hue-tint`, `hue-edge`, `hue-dot` or `hue-ink`. Never fill a large area with the hue
- **Shape:** `rounded-card` (16px) for cards and panels, `rounded-control` (10px) for buttons and inputs, `rounded-bar` (6px) for schedule bars, `rounded-full` for pills
- **Depth:** `shadow-soft` for cards and panels, `shadow-lifted` on hover, `shadow-raised` for the drawer, toasts and drag preview. Prefer shadow to borders; use a 1px `line` border only where needed
- **Type:** `font-display` (Space Grotesk) for headings, card titles and grid dates; Manrope for everything else. `label-caps` for section labels and counts; `page-title` for page headings
- **Spacing:** 8px grid; use even Tailwind steps (2, 4, 6, 8, 12). Odd steps only for tight gaps inside a control
- **Dropdowns:** always `<app-select>` (`shared/select.ts`, CDK Overlay + Listbox), never a native `<select>`. Options can show an avatar (`avatarColour`) or a colour dot (`colour`); bind `[(value)]` or use it as a form control
- **Shared classes:** `panel`, `btn-primary`, `btn-secondary`, `btn-quiet`, `btn-pill`, `form-label`, `form-input`, `form-select`, `pill-select`, `field-error`, `empty-state`. Reuse them before writing new control styles
- **Load and availability:** utilisation uses `accent` under 50% (available), then `ok`, `warn`, `over` (D15). Each working day in the availability strip is a fill bar: booked hours in `ink-faint`, free hours in `ok-500`, all `over-500` when over capacity. Time off is a solid `ink` block with white text, never a hue
- **Layout:** pages always use the full content width. Only a page's own area (a grid, the board) scrolls sideways, never the page; scroll areas use `scroll-thin`, or `scroll-quiet` to show the scrollbar on hover
- **Accessibility:** text meets WCAG AA (4.5:1) on its background; every control has a visible `accent-200` focus ring

## Working documentation

- `docs/demo-brief.md`: source of truth for scope, data model, acceptance criteria and the demo script
- `docs/plan.md`: phases, task checklists, decisions and the current position
- At the start of every session, read the "Where we left off" block at the top of `docs/plan.md`
- Tick tasks in `docs/plan.md` as they are finished; update "Where we left off", the phase status and the progress log at the end of every session or phase
- Work one phase at a time. **At the end of every phase, stop for human review.** Do not start the next phase until the user approves it
- Ideas outside the brief go in the "Later" list in `docs/plan.md`, not into the code
- Ask before adding any paid library
