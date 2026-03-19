import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageEnv } from "@/lib/env";
import type { ListedFile } from "@/types/workflow";

const ALLOWED_PREFIXES = ["inputs", "runs", "workflows"];

export function getWorkspaceBase(workspaceId: string) {
  const env = getStorageEnv();
  return path.resolve(env.workspacesRoot, workspaceId);
}

export function resolveWorkspacePath(workspaceId: string, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const rootSegment = normalized.split("/")[0];

  if (!ALLOWED_PREFIXES.includes(rootSegment)) {
    throw new Error("Invalid path root. Must start with inputs/, runs/, or workflows/");
  }

  const base = getWorkspaceBase(workspaceId);
  const resolved = path.resolve(base, normalized);
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid path traversal");
  }
  return resolved;
}

export async function ensureWorkspaceFolders(workspaceId: string) {
  const base = getWorkspaceBase(workspaceId);
  await mkdir(path.join(base, "inputs"), { recursive: true });
  await mkdir(path.join(base, "runs"), { recursive: true });
  await mkdir(path.join(base, "workflows"), { recursive: true });
}

export async function ensureRunFolders(workspaceId: string, runId: string) {
  await mkdir(resolveWorkspacePath(workspaceId, `runs/${runId}/outputs`), {
    recursive: true,
  });
  await mkdir(resolveWorkspacePath(workspaceId, `runs/${runId}/logs`), {
    recursive: true,
  });
}

export async function saveInputFile(
  workspaceId: string,
  fileName: string,
  bytes: Uint8Array,
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relativePath = `inputs/${Date.now()}_${safeName}`;
  const absPath = resolveWorkspacePath(workspaceId, relativePath);
  await writeFile(absPath, bytes);
  return relativePath;
}

export async function listFiles(workspaceId: string, dir = "inputs") {
  if (!["inputs", "runs", "workflows"].includes(dir)) {
    throw new Error("Invalid directory");
  }

  const base = resolveWorkspacePath(workspaceId, dir);
  const entries = await readdir(base, { withFileTypes: true });
  const files: ListedFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const rel = `${dir}/${entry.name}`;
    const abs = resolveWorkspacePath(workspaceId, rel);
    const s = await stat(abs);
    files.push({
      path: rel,
      name: entry.name,
      size: s.size,
      modifiedAt: s.mtime.toISOString(),
      type: "file",
    });
  }

  return files.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
}
