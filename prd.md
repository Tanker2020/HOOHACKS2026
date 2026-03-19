# PRD — “Workflow Autopilot” (Consulting / IB Deliverables Engine)

## 0) Summary
Workflow Autopilot is a consultant-grade automation dashboard that turns uploaded client documents into polished deliverables (investment memo, proposal deck, diligence checklist, KPI tables) via a node-based workflow builder. It runs workflows server-side using OpenClaw and writes outputs back to a workspace folder on disk. A Filestash instance (embedded via iframe) provides file upload/browse/preview functionality without building a custom file manager.

**Primary demo:** upload docs → pick template workflow → run → review checkpoint → download deck/memo/table with citations.

---

## 1) Goals & Non-Goals

### Goals (Hackathon MVP)
1. Sleek, modern “consulting/finance bro” UI with crisp workflow experience and artifact outputs.
2. Template-driven workflows that produce “client-ready” deliverables:
   - Memo (markdown + optional PDF)
   - Slide deck (PPTX)
   - KPI table (CSV + table viewer)
   - Task list (JSON + UI checklist)
   - Sources/citations panel
3. Node-based workflow builder (React Flow-like canvas) with configuration side panel.
4. Workflow execution engine in Next.js backend that:
   - Stores workflow definitions
   - Creates runs
   - Executes nodes sequentially/topologically
   - Persists run state + logs
   - Supports “Human Review Gate” pause/resume
5. Workspace file system integration:
   - Filestash embedded in iframe for uploads/browsing
   - Backend lists files by scanning the workspace directory on disk
   - OpenClaw reads files from the same workspace directory (shared bind mount / same server path)
6. Secure OpenClaw calls:
   - OpenClaw not public; only reachable from server (internal Docker network or private network)
   - API key stored server-side (env var) and never exposed to client

### Non-Goals (Out of scope for hackathon)
- True multi-tenant auth (SSO, RBAC, per-user workspaces)
- S3/R2 integration (optional later)
- Full scheduling/webhooks/cron
- Slack/Email sending (stretch only)
- Marketplace of nodes
- Complex branching/loops beyond a simple “review gate” and optional single conditional

---

## 2) Personas & Use Cases

### Persona A: Strategy Consultant
- Receives a client brief + a few PDFs and needs:
  - proposal deck
  - workplan/timeline
  - risks and assumptions
  - “next steps” tasks

### Persona B: IB / PE Analyst
- Has a 10-K or earnings transcript and needs:
  - investment memo
  - key KPIs and risks
  - diligence questions
  - quick summary deck

### Use Case 1: “Client Brief → Proposal Deck”
- Input: client brief PDF + optional market research PDF
- Output: proposal memo + deck + workplan + tasks

### Use Case 2: “10-K → Investment Memo”
- Input: 10-K PDF (+ optional transcript)
- Output: memo + KPI table + risks + deck summary

### Use Case 3: “Data Room Dump → Diligence Checklist”
- Input: set of PDFs
- Output: red flags + checklist + follow-up questions + memo

---

## 3) Key Product Principles (What makes it “win-worthy”)
1. **Artifacts-first**: outputs must look like real deliverables, not chat blobs.
2. **Evidence & citations**: every major claim can reference sources (file + page/excerpt).
3. **Human-in-the-loop**: built-in review checkpoint for safety/control.
4. **Templates**: 3 click-to-run workflows; user customizes only if they want.
5. **Polish**: “finance/consultant” aesthetic — dark accents, crisp typography, premium feel.

---

## 4) Tech Stack & Architecture

### Frontend
- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS
- React Flow (or similar) for workflow canvas
- Shadcn/ui components (optional but recommended)
- State mgmt: React Query or SWR for API calls

### Backend (Required)
- Next.js Route Handlers under `/app/api/*`
- SQLite (preferred) via Prisma or Drizzle
- File system operations using Node `fs` in server routes
- Workflow execution engine as server-side module
- Optional: Server-Sent Events (SSE) for live run logs (or polling)

### Integrations
- Filestash deployed separately; embedded in iframe
- OpenClaw deployed separately; accessible only internally (Docker network or private IP)
- Artifact generation libraries:
  - PPTX: `pptxgenjs` (recommended)
  - CSV: native generation
  - PDF (optional): `puppeteer` or `react-pdf` export (stretch)

---

## 5) Data & Storage Model

### Disk Layout (single-server demo)
All workspaces and outputs live under:
`/hoohacks_files/workspaces/<workspaceId>/`

Structure:
- `/inputs/` (user uploads; Filestash points here)
- `/runs/<runId>/outputs/`
- `/runs/<runId>/logs/`
- `/workflows/` (optional if storing JSON on disk)

Example:
- `/hoohacks_files/workspaces/demo/inputs/10k.pdf`
- `/hoohacks_files/workspaces/demo/runs/run_001/outputs/deck.pptx`

### DB Schema (SQLite)
Tables:

**workspaces**
- id (string/uuid)
- name (string)
- rootPath (string)
- createdAt

**workflows**
- id (string/uuid)
- workspaceId
- name
- description
- graphJson (TEXT) — workflow definition
- createdAt
- updatedAt

**runs**
- id (string/uuid)
- workspaceId
- workflowId
- status (enum: queued, running, waiting_review, succeeded, failed)
- startedAt
- finishedAt
- outputsPath (string)
- summaryJson (TEXT) — quick summary + artifact refs

**run_nodes**
- id (string)
- runId
- nodeId (string)
- type (string)
- name (string)
- status (queued, running, waiting_review, succeeded, failed)
- startedAt
- finishedAt
- inputJson (TEXT)
- outputJson (TEXT)
- errorText (TEXT)

**artifacts**
- id (string/uuid)
- runId
- type (memo_md, memo_pdf, deck_pptx, kpis_csv, tasks_json, sources_json, bundle_zip)
- path (string)
- metadataJson (TEXT)

**citations**
- id (string/uuid)
- runId
- nodeId
- filePath (string)
- pageNumber (nullable int)
- excerpt (TEXT)
- claimId (string) (optional)

---

## 6) Workflow Definition Format

Workflow is a directed acyclic graph (DAG) stored as JSON:
- nodes: { id, type, name, config, inputs }
- edges: { from, to }

Node config patterns:
- `style`: client-ready | internal
- `inputFiles`: list of relative paths
- `outputName`: optional

Execution order:
- topological sort
- default to sequential execution for hackathon MVP

---

## 7) Node Types (MVP)

### Node: `read_files`
**Purpose:** load and extract text from selected files.
Inputs:
- list of file paths (relative to workspace inputs)
Outputs:
- extracted text chunks, file metadata
Notes:
- For PDF: use a PDF text extractor
- Store extracted text in run node output JSON (and optionally as a file)

### Node: `summarize_with_citations`
**Purpose:** produce structured summary with citations.
Config:
- style: client-ready | internal
Outputs:
- sections: array of { title, bullets, citations[] }
- citations saved to `citations` table and sources JSON

### Node: `generate_memo`
**Purpose:** produce a memo file (markdown) and optionally PDF.
Outputs:
- memo.md (always)
- memo.pdf (optional stretch)
Memo template sections:
- Executive Summary
- Context & Objectives
- Key Findings
- Risks & Assumptions
- Recommended Next Steps
- Sources (citations)

### Node: `extract_kpis`
**Purpose:** create a KPI table from text/CSV.
Outputs:
- kpis.csv
- table JSON for UI

### Node: `generate_deck`
**Purpose:** output a PPTX using a template.
Outputs:
- deck.pptx
Deck slides (required):
1. Title
2. Agenda
3. Situation / Context
4. Key Insights (with citations)
5. Recommendation
6. Workplan & Timeline
7. Risks & Mitigations
8. Sources / Appendix

### Node: `review_gate`
**Purpose:** pause run and require user approval/edit.
Behavior:
- run status becomes `waiting_review`
- UI shows draft memo + deck outline
User actions:
- Approve: resume downstream nodes
- Request edits: capture edit notes, re-run memo/deck nodes (or just downstream)

### Node: `task_list`
**Purpose:** generate structured tasks.
Outputs:
- tasks.json
- UI checklist

### Node: `export_bundle`
**Purpose:** zip key artifacts.
Outputs:
- bundle.zip

---

## 8) Templates (Must ship with 3)

### Template A: “Client Brief → Proposal Deck”
Graph:
- read_files → summarize_with_citations → generate_memo → review_gate → generate_deck → task_list → export_bundle
Default config:
- style = client-ready

### Template B: “10-K → Investment Memo”
Graph:
- read_files → extract_kpis → summarize_with_citations → generate_memo → review_gate → generate_deck → export_bundle
Default config:
- style = internal (toggle to client-ready)

### Template C: “Data Room → Diligence Checklist”
Graph:
- read_files → summarize_with_citations (red flags mode) → task_list (as diligence checklist) → review_gate → generate_memo → export_bundle

---

## 9) User Experience & Visual Design (Finance/Consultant Aesthetic)

### Overall Visual Direction
- “Premium ops dashboard” vibe: think Ramp + Linear + Notion.
- Dark header / sidebar, light content.
- Subtle gradients and glass blur accents (sparingly).
- Typography: Inter, medium weight headers.
- Buttons: strong primary accent (electric blue/purple), pill radius.
- Cards: white, soft shadow, tight spacing.

### Layout
**Global layout**
- Left vertical sidebar (collapsed icons optional)
- Top header with workspace selector + run controls
- Main content area with tab navigation

Sidebar items:
- Workflows
- Runs
- Artifacts
- Files

Top header:
- Workspace dropdown
- “Run Workflow” primary button
- Run status chip (Idle / Running / Waiting Review / Complete)
- Optional: “Client-ready toggle” global (applies to nodes)

### Workflows Page (Most Important)
Three-panel structure:
1) Left: Templates + Node palette
2) Center: Workflow canvas (graph)
3) Right: Node Inspector (config)

Canvas requirements:
- snap to grid
- zoom/pan
- click node to open inspector
- node status badges (idle/running/success/fail)
- edges show execution flow
- “Run from here” optional stretch

Inspector requirements:
- Node title + type
- Inputs selector (file picker pulls from `/api/workspaces/:id/files`)
- Toggles (style: client-ready/internal)
- Output naming
- “Save workflow” button
- “Validate” badge (green/red)

### Runs Page
Runs list table:
- Run ID (short)
- Workflow name
- Status
- Started time
- Duration
- Button: View

Run detail view:
- Left: node execution timeline
- Right: live logs panel (scroll)
- If waiting_review:
  - show review UI + approve/edit buttons

### Artifacts Page
Grid of artifact cards:
- Memo (view)
- Deck (download)
- KPIs (view)
- Tasks (view)
- Sources (view)
- Bundle (download)

Artifact viewer:
- Memo: markdown renderer + citation footnotes
- KPIs: interactive table viewer (sortable)
- Tasks: checklist w priorities
- Sources: list citations grouped by file

### Files Page
- Embedded Filestash iframe filling most of screen.
- Header: “Workspace Files” + “Open in new tab”
- Optional: quick “Inputs folder” breadcrumb

---

## 10) API Contract (Next.js Routes)

### Workspaces
- GET `/api/workspaces`
- POST `/api/workspaces` { name } → creates folder structure under `/hoohacks_files/workspaces/<id>/inputs`

### File Listing (server-side scan)
- GET `/api/workspaces/:id/files?dir=inputs`
Returns:
[{ path, name, size, modifiedAt, type }]

### Workflows
- GET `/api/workflows?workspaceId=`
- POST `/api/workflows` { workspaceId, name, graphJson }
- PUT `/api/workflows/:id` { graphJson, name }

### Runs
- POST `/api/runs` { workspaceId, workflowId, selectedInputs? }
- GET `/api/runs?workspaceId=`
- GET `/api/runs/:runId`
- POST `/api/runs/:runId/approve` { notes? }
- POST `/api/runs/:runId/request-edits` { notes }

### Artifacts
- GET `/api/artifacts?runId=`
- GET `/api/artifacts/:artifactId/download` (streams file)
- GET `/api/artifacts/:artifactId/view` (for memo markdown / JSON)

### Logging
- Either:
  - SSE: GET `/api/runs/:runId/stream`
  - or polling: GET `/api/runs/:runId` includes latest logs + node states

---

## 11) OpenClaw Integration

### Constraints
- OpenClaw endpoint is private (internal network).
- Orchestrator calls OpenClaw with:
  - `Authorization: Bearer ${OPENCLAW_API_KEY}`

### Calls
At minimum, implement these OpenClaw task invocations:
- summarize_with_citations
- memo_generation
- deck_outline
- kpi_extraction
- task_list

OpenClaw should return JSON outputs, not files.
Then Next.js backend converts JSON → artifacts (pptx/csv/md).

---

## 12) Security (Hackathon-Appropriate)
- OpenClaw not accessible publicly.
- Next.js backend is the only caller.
- Workspace path traversal prevention:
  - Only allow paths under `/hoohacks_files/workspaces/<id>/`
  - Never accept raw absolute paths from client.
- Filestash is protected behind simple access (basic auth or private link) if deployed publicly.
- Minimal user auth is acceptable for demo.

---

## 13) Performance & Reliability Requirements
- Demo workflow should complete in < 2 minutes on typical server.
- UI should show progress within 1–2 seconds of node transitions.
- If server restarts, DB retains workflow + run status.

---

## 14) Acceptance Criteria (MVP “Done” Definition)
1. A workspace exists with Filestash iframe pointing at its inputs folder.
2. User uploads at least one PDF and sees it in the file selector list.
3. User loads a template workflow and runs it.
4. Run progresses node-by-node with visible statuses.
5. Review gate pauses run; user approves; run finishes.
6. Artifacts page shows:
   - memo (viewable)
   - deck (download)
   - KPI table (viewable)
   - sources (viewable)
7. Outputs are written to disk under runs/<runId>/outputs.

---

## 15) Implementation Notes / Task Breakdown (for Codex)
1. Next.js project scaffold + Tailwind + shadcn/ui
2. DB schema (Prisma/Drizzle) + migrations (SQLite)
3. Workspace creation + folder structure
4. File listing API (scan inputs directory)
5. Workflow builder page with React Flow
6. Template workflow JSONs + loader
7. Run engine module:
   - load workflow graph
   - topological execution
   - persist node state to DB
   - call OpenClaw
   - write artifacts to disk
8. Review gate UI + approve/edit endpoints
9. Artifact generation:
   - memo markdown renderer + storage
   - CSV generation
   - PPTX deck generation with template
   - sources JSON
10. Artifacts page viewer + download endpoints
11. Files page iframe integration for Filestash
12. Polish pass: animations, icons, empty states, run status chips, premium styling

---

## 16) Visual Components Checklist (Explicit)
- Sidebar with icons + active highlight
- Workspace dropdown
- Primary “Run Workflow” button with loading state
- Status chip: Idle/Running/Waiting Review/Complete
- Template cards (3)
- Node palette list
- Graph node card component:
  - icon, title, status dot, quick outputs label
- Right inspector form components:
  - file picker dropdown
  - toggles
  - text inputs
- Runs table
- Run timeline component
- Logs console component
- Artifact cards grid
- Memo viewer (markdown)
- KPI table viewer
- Tasks checklist
- Sources viewer grouped by file
- Filestash iframe container w “Open new tab” button

---

## 17) Demo Script (What the UI should support)
1. Open workspace “HooHacks Demo”
2. Go Files tab → upload PDFs into inputs
3. Go Workflows tab → select “Client Brief → Proposal Deck”
4. Click Run → watch nodes execute
5. Review gate opens → approve
6. Go Artifacts tab → open memo + download deck + show sources