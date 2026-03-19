import path from "node:path";
import { readFile } from "node:fs/promises";
import { badRequest, serverError } from "@/lib/http";
import { getDownloadMime } from "@/lib/workflow/engine";
import { getRun } from "@/lib/workflow/repository";
import { resolveWorkspacePath } from "@/lib/filesystem/workspace";
import { selectRows } from "@/lib/supabase-rest";

type Context = { params: Promise<{ artifactId: string }> };

export async function GET(_: Request, ctx: Context) {
  try {
    const { artifactId } = await ctx.params;

    const rows = await selectRows<{ id: string; run_id: string; path: string }>("artifacts", {
      id: `eq.${artifactId}`,
      select: "id,run_id,path",
      limit: "1",
    });

    const artifact = rows[0];
    if (!artifact) {
      return badRequest("Artifact not found", 404);
    }

    const run = await getRun(artifact.run_id);
    if (!run) {
      return badRequest("Run not found", 404);
    }

    const abs = resolveWorkspacePath(run.workspace_id, artifact.path);
    const bytes = await readFile(abs);
    const fileName = path.basename(artifact.path);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": getDownloadMime(artifact.path),
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
