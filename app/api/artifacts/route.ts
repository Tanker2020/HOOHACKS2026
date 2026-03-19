import { badRequest, ok, serverError } from "@/lib/http";
import { getArtifacts } from "@/lib/workflow/repository";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const runId = url.searchParams.get("runId");
    if (!runId) {
      return badRequest("runId is required");
    }

    const artifacts = await getArtifacts(runId);
    return ok({ artifacts });
  } catch (error) {
    return serverError(error);
  }
}
