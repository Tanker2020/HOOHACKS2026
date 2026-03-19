export type NodeType =
  | "read_files"
  | "summarize_with_citations"
  | "generate_memo"
  | "extract_kpis"
  | "generate_deck"
  | "review_gate"
  | "task_list"
  | "export_bundle";

export type RunStatus =
  | "queued"
  | "running"
  | "waiting_review"
  | "succeeded"
  | "failed";

export type RunNodeStatus = RunStatus;

export type WorkflowNode = {
  id: string;
  type: NodeType;
  name: string;
  config?: Record<string, unknown>;
};

export type WorkflowEdge = {
  from: string;
  to: string;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  root_path: string;
  created_at: string;
};

export type WorkflowRecord = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  graph_json: WorkflowGraph;
  created_at: string;
  updated_at: string;
};

export type RunRecord = {
  id: string;
  workspace_id: string;
  workflow_id: string;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  outputs_path: string;
  summary_json: Record<string, unknown> | null;
};

export type RunNodeRecord = {
  id: string;
  run_id: string;
  node_id: string;
  type: NodeType;
  name: string;
  status: RunNodeStatus;
  started_at: string | null;
  finished_at: string | null;
  input_json: Record<string, unknown> | null;
  output_json: Record<string, unknown> | null;
  error_text: string | null;
};

export type ArtifactRecord = {
  id: string;
  run_id: string;
  type: string;
  path: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type CitationRecord = {
  id: string;
  run_id: string;
  node_id: string;
  file_path: string;
  page_number: number | null;
  excerpt: string;
  claim_id: string | null;
};

export type ListedFile = {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  type: "file";
};
