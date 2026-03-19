create table if not exists workspaces (
  id uuid primary key,
  name text not null,
  root_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists workflows (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  graph_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  workflow_id uuid not null references workflows(id) on delete cascade,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz,
  outputs_path text not null,
  summary_json jsonb
);

create table if not exists run_nodes (
  id uuid primary key,
  run_id uuid not null references runs(id) on delete cascade,
  node_id text not null,
  type text not null,
  name text not null,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz,
  input_json jsonb,
  output_json jsonb,
  error_text text
);

create table if not exists artifacts (
  id uuid primary key,
  run_id uuid not null references runs(id) on delete cascade,
  type text not null,
  path text not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists citations (
  id uuid primary key,
  run_id uuid not null references runs(id) on delete cascade,
  node_id text not null,
  file_path text not null,
  page_number integer,
  excerpt text not null,
  claim_id text
);

create index if not exists idx_runs_workspace on runs(workspace_id);
create index if not exists idx_run_nodes_run on run_nodes(run_id);
create index if not exists idx_artifacts_run on artifacts(run_id);
create index if not exists idx_citations_run on citations(run_id);
