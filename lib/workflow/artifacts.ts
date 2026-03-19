import { writeFile } from "node:fs/promises";
import { resolveWorkspacePath } from "@/lib/filesystem/workspace";

export async function writeJsonArtifact(
  workspaceId: string,
  runId: string,
  fileName: string,
  data: unknown,
) {
  const relativePath = `runs/${runId}/outputs/${fileName}`;
  const abs = resolveWorkspacePath(workspaceId, relativePath);
  await writeFile(abs, JSON.stringify(data, null, 2), "utf8");
  return relativePath;
}

export async function writeTextArtifact(
  workspaceId: string,
  runId: string,
  fileName: string,
  text: string,
) {
  const relativePath = `runs/${runId}/outputs/${fileName}`;
  const abs = resolveWorkspacePath(workspaceId, relativePath);
  await writeFile(abs, text, "utf8");
  return relativePath;
}

export async function writeCsvArtifact(
  workspaceId: string,
  runId: string,
  fileName: string,
  rows: Record<string, string | number | null>[],
) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const value = row[h];
          const raw = value == null ? "" : String(value);
          const escaped = raw.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(","),
    );
  }

  return writeTextArtifact(workspaceId, runId, fileName, lines.join("\n"));
}
