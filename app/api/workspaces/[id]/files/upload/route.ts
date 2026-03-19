import { saveInputFile } from "@/lib/filesystem/workspace";
import { badRequest, ok, serverError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".docx",
];
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return badRequest("Missing file");
    }

    if (file.size > MAX_SIZE_BYTES) {
      return badRequest("File exceeds 25MB limit");
    }

    const lower = file.name.toLowerCase();
    const allowed = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!allowed) {
      return badRequest("Unsupported file extension");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const savedPath = await saveInputFile(id, file.name, bytes);
    return ok({ path: savedPath, name: file.name, size: file.size }, 201);
  } catch (error) {
    return serverError(error);
  }
}
