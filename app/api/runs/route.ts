import { randomUUID } from "node:crypto";
import { executeRun } from "@/lib/workflow/engine";
import { topologicalSort } from "@/lib/workflow/graph";
import { getWorkflow } from "@/lib/workflow/repository";
import { badRequest, ok, serverError } from "@/lib/http";
import { insertRows, selectRows } from "@/lib/supabase-rest";
import { ensureRunFolders } from "@/lib/filesystem/workspace";
import type { RunNodeRecord, RunRecord } from "@/types/workflow";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    if (!workspaceId) {
      return badRequest("workspaceId is required");
    }

    const runs = await selectRows<RunRecord>("runs", {
      workspace_id: `eq.${workspaceId}`,
      select: "*",
      order: "started_at.desc",
    });

    return ok({ runs });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      workspaceId?: string;
      workflowId?: string;
      selectedInputs?: string[];
    };

    if (!body.workspaceId || !body.workflowId) {
      return badRequest("workspaceId and workflowId are required");
    }

    const workflow = await getWorkflow(body.workflowId);
    if (!workflow) {
      return badRequest("Workflow not found", 404);
    }

    const runId = randomUUID();
    const now = new Date().toISOString();
    await ensureRunFolders(body.workspaceId, runId);

    const runRows = await insertRows<RunRecord>("runs", [
      {
        id: runId,
        workspace_id: body.workspaceId,
        workflow_id: body.workflowId,
        status: "queued",
        started_at: null,
        finished_at: null,
        outputs_path: `runs/${runId}/outputs`,
        summary_json: {
          selectedInputs: body.selectedInputs ?? [],
          createdAt: now,
        },
      },
    ]);

    const sorted = topologicalSort(workflow.graph_json);
    const nodeRows = sorted.map((node) => ({
      id: randomUUID(),
      run_id: runId,
      node_id: node.id,
      type: node.type,
      name: node.name,
      status: "queued",
      started_at: null,
      finished_at: null,
      input_json: node.config ?? {},
      output_json: null,
      error_text: null,
    }));

    await insertRows<RunNodeRecord>("run_nodes", nodeRows);

    void executeRun(runId);

    return ok({ run: runRows[0] }, 201);
  } catch (error) {
    return serverError(error);
  }
}
