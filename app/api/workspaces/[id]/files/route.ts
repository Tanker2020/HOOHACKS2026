import { listFiles } from "@/lib/filesystem/workspace";
import { badRequest, ok } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const dir = url.searchParams.get("dir") ?? "inputs";
    const files = await listFiles(id, dir);
    return ok({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to list files";
    return badRequest(message, 400);
  }
}
