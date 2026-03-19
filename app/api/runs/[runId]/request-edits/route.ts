import { requestRunEdits } from "@/lib/workflow/engine";
import { badRequest, ok, serverError } from "@/lib/http";

type Context = { params: Promise<{ runId: string }> };

export async function POST(req: Request, ctx: Context) {
  try {
    const { runId } = await ctx.params;
    const body = (await req.json()) as { notes?: string };
    if (!body.notes?.trim()) {
      return badRequest("notes is required");
    }

    await requestRunEdits(runId, body.notes);
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
