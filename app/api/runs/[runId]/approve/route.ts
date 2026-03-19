import { approveRun } from "@/lib/workflow/engine";
import { ok, serverError } from "@/lib/http";

type Context = { params: Promise<{ runId: string }> };

export async function POST(req: Request, ctx: Context) {
  try {
    const { runId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { notes?: string };
    await approveRun(runId, body.notes);
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
