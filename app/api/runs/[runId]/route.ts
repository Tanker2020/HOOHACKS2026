import { getRun, getRunNodes, getWorkflow } from "@/lib/workflow/repository";
import { badRequest, ok, serverError } from "@/lib/http";

type Context = { params: Promise<{ runId: string }> };

export async function GET(_: Request, ctx: Context) {
  try {
    const { runId } = await ctx.params;
    const run = await getRun(runId);
    if (!run) {
      return badRequest("Run not found", 404);
    }

    const workflow = await getWorkflow(run.workflow_id);
    if (!workflow) {
      return badRequest("Workflow not found", 404);
    }

    const nodes = await getRunNodes(runId);
    return ok({ run, workflow, nodes });
  } catch (error) {
    return serverError(error);
  }
}
