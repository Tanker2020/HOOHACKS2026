import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolveWorkspacePath } from "@/lib/filesystem/workspace";
import { badRequest, ok, serverError } from "@/lib/http";
import { insertRows, selectRows } from "@/lib/supabase-rest";
import type { WorkflowGraph, WorkflowRecord } from "@/types/workflow";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    if (!workspaceId) {
      return badRequest("workspaceId is required");
    }

    const workflows = await selectRows<WorkflowRecord>("workflows", {
      workspace_id: `eq.${workspaceId}`,
      select: "*",
      order: "updated_at.desc",
    });

    return ok({ workflows });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      workspaceId?: string;
      name?: string;
      description?: string;
      graphJson?: WorkflowGraph;
    };

    if (!body.workspaceId || !body.name || !body.graphJson) {
      return badRequest("workspaceId, name, and graphJson are required");
    }

    const now = new Date().toISOString();
    const id = randomUUID();

    const rows = await insertRows<WorkflowRecord>("workflows", [
      {
        id,
        workspace_id: body.workspaceId,
        name: body.name,
        description: body.description ?? null,
        graph_json: body.graphJson,
        created_at: now,
        updated_at: now,
      },
    ]);

    const snapshotPath = resolveWorkspacePath(body.workspaceId, `workflows/${id}.json`);
    await writeFile(snapshotPath, JSON.stringify(body.graphJson, null, 2), "utf8");

    return ok({ workflow: rows[0] }, 201);
  } catch (error) {
    return serverError(error);
  }
}
