import { writeFile } from "node:fs/promises";
import { resolveWorkspacePath } from "@/lib/filesystem/workspace";
import { badRequest, ok, serverError } from "@/lib/http";
import { selectRows, updateRows } from "@/lib/supabase-rest";
import type { WorkflowGraph, WorkflowRecord } from "@/types/workflow";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const workflows = await selectRows<WorkflowRecord>("workflows", {
      id: `eq.${id}`,
      select: "*",
      limit: "1",
    });

    if (!workflows[0]) {
      return badRequest("Workflow not found", 404);
    }

    return ok({ workflow: workflows[0] });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      graphJson?: WorkflowGraph;
    };

    if (!body.name && !body.description && !body.graphJson) {
      return badRequest("At least one field is required");
    }

    const workflows = await selectRows<WorkflowRecord>("workflows", {
      id: `eq.${id}`,
      select: "*",
      limit: "1",
    });
    const existing = workflows[0];
    if (!existing) {
      return badRequest("Workflow not found", 404);
    }

    const rows = await updateRows<WorkflowRecord>("workflows", { id }, {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description ? { description: body.description } : {}),
      ...(body.graphJson ? { graph_json: body.graphJson } : {}),
      updated_at: new Date().toISOString(),
    });

    if (body.graphJson) {
      const snapshotPath = resolveWorkspacePath(existing.workspace_id, `workflows/${id}.json`);
      await writeFile(snapshotPath, JSON.stringify(body.graphJson, null, 2), "utf8");
    }

    return ok({ workflow: rows[0] });
  } catch (error) {
    return serverError(error);
  }
}
