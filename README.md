# Workflow Autopilot (Hoohacks MVP)

Next.js dashboard + API orchestration engine for consultant/IB deliverables, using:
- Supabase Postgres for workflow/run metadata
- Shared workspace filesystem for all inputs/outputs
- OpenClaw private API for generation tasks
- Optional Filestash mounted to the same workspace folder

## Environment

Create `.env.local`:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENCLAW_BASE_URL=http://openclaw:8080
OPENCLAW_API_KEY=...
WORKSPACES_ROOT=/hoohacks_files/workspaces
FILESTASH_BASE_URL=http://filestash:8334
```

## Shared Workspace Contract

All data that OpenClaw must see is stored under:

`$WORKSPACES_ROOT/<workspaceId>/`

- `inputs/`
- `runs/<runId>/outputs/`
- `runs/<runId>/logs/`
- `workflows/`

## Supabase Setup

Run SQL in `docs/supabase_schema.sql` against your Supabase project.

## Run

```bash
npm run dev
```

Open `http://localhost:3000/workflows`.

## Diagrams

- `docs/architecture/frontend.mmd`
- `docs/architecture/fullstack.mmd`
