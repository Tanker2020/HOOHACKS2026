import { insertRows, selectRows, updateRows } from "@/lib/supabase-rest";
import type {
  ArtifactRecord,
  CitationRecord,
  RunNodeRecord,
  RunRecord,
  WorkflowRecord,
  WorkspaceRecord,
} from "@/types/workflow";

export async function getWorkspace(id: string) {
  const rows = await selectRows<WorkspaceRecord>("workspaces", {
    "id": `eq.${id}`,
    select: "*",
    limit: "1",
  });
  return rows[0] ?? null;
}

export async function getWorkflow(id: string) {
  const rows = await selectRows<WorkflowRecord>("workflows", {
    "id": `eq.${id}`,
    select: "*",
    limit: "1",
  });
  return rows[0] ?? null;
}

export async function getRun(id: string) {
  const rows = await selectRows<RunRecord>("runs", {
    "id": `eq.${id}`,
    select: "*",
    limit: "1",
  });
  return rows[0] ?? null;
}

export async function getRunNodes(runId: string) {
  return selectRows<RunNodeRecord>("run_nodes", {
    run_id: `eq.${runId}`,
    select: "*",
    order: "id.asc",
  });
}

export async function getArtifacts(runId: string) {
  return selectRows<ArtifactRecord>("artifacts", {
    run_id: `eq.${runId}`,
    select: "*",
    order: "created_at.desc",
  });
}

export async function createArtifacts(rows: Record<string, unknown>[]) {
  return insertRows<ArtifactRecord>("artifacts", rows);
}

export async function createCitations(rows: Record<string, unknown>[]) {
  return insertRows<CitationRecord>("citations", rows);
}

export async function patchRun(runId: string, patch: Record<string, unknown>) {
  const rows = await updateRows<RunRecord>("runs", { id: runId }, patch);
  return rows[0] ?? null;
}

export async function patchRunNode(runNodeId: string, patch: Record<string, unknown>) {
  const rows = await updateRows<RunNodeRecord>("run_nodes", { id: runNodeId }, patch);
  return rows[0] ?? null;
}
