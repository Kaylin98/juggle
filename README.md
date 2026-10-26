# Juggle

Resource planning and work intake for in-house teams. Demo build; see `docs/demo-brief.md` and `docs/plan.md`.

## Requirements

- Docker
- .NET 10 SDK
- Node 24 LTS

## Run

```sh
docker compose up -d                       # Postgres on localhost:5432
dotnet run --project api/Juggle.Api        # API on http://localhost:5268 (migrates and seeds on startup)
cd web && npm install && npm start         # Web on http://localhost:4200
```

Open http://localhost:4200 and pick a demo user.

## Reset the demo data

Drops the database, re-applies migrations and seeds fresh data relative to the current week. Stop the API first.

```sh
dotnet run --project api/Juggle.Api -- --reset-demo
```

## Test and lint

```sh
dotnet test api/Juggle.slnx                # needs Docker running (Testcontainers)
cd web && npm test -- --watch=false && npx ng lint
```
