import { randomUUID } from "node:crypto";
import { insertRows, selectRows } from "@/lib/supabase-rest";
import { ensureWorkspaceFolders, getWorkspaceBase } from "@/lib/filesystem/workspace";
import { badRequest, ok, serverError } from "@/lib/http";
import type { WorkspaceRecord } from "@/types/workflow";

export async function GET() {
  try {
    const workspaces = await selectRows<WorkspaceRecord>("workspaces", {
      select: "*",
      order: "created_at.desc",
    });
    return ok({ workspaces });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return badRequest("name is required");
    }

    const id = randomUUID();
    await ensureWorkspaceFolders(id);

    const rows = await insertRows<WorkspaceRecord>("workspaces", [
      {
        id,
        name,
        root_path: getWorkspaceBase(id),
      },
    ]);

    return ok({ workspace: rows[0] }, 201);
  } catch (error) {
    return serverError(error);
  }
}
