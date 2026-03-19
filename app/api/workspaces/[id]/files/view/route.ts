import { readFile } from "node:fs/promises";
import { resolveWorkspacePath } from "@/lib/filesystem/workspace";
import { badRequest, serverError } from "@/lib/http";
import { getDownloadMime } from "@/lib/workflow/engine";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const relPath = url.searchParams.get("path");
    if (!relPath) {
      return badRequest("path query param is required");
    }

    const abs = resolveWorkspacePath(id, relPath);
    const file = await readFile(abs);

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": getDownloadMime(relPath),
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
