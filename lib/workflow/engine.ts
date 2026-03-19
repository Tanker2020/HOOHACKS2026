import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { callOpenClaw } from "@/lib/openclaw";
import {
  createArtifacts,
  createCitations,
  getArtifacts,
  getRun,
  getRunNodes,
  getWorkflow,
  getWorkspace,
  patchRun,
  patchRunNode,
} from "@/lib/workflow/repository";
import { topologicalSort } from "@/lib/workflow/graph";
import { writeCsvArtifact, writeJsonArtifact, writeTextArtifact } from "@/lib/workflow/artifacts";
import { ensureRunFolders, resolveWorkspacePath } from "@/lib/filesystem/workspace";
import type { RunNodeRecord, WorkflowNode } from "@/types/workflow";

const running = new Set<string>();

type ExecutionContext = {
  runId: string;
  workspaceId: string;
  selectedInputs: string[];
};

export async function executeRun(runId: string) {
  if (running.has(runId)) {
    return;
  }
  running.add(runId);

  try {
    const run = await getRun(runId);
    if (!run) {
      throw new Error("Run not found");
    }

    const workflow = await getWorkflow(run.workflow_id);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const workspace = await getWorkspace(run.workspace_id);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await ensureRunFolders(run.workspace_id, run.id);
    await patchRun(run.id, { status: "running", started_at: run.started_at ?? new Date().toISOString() });

    const sortedNodes = topologicalSort(workflow.graph_json);
    const runNodes = await getRunNodes(run.id);
    const byNodeId = new Map(runNodes.map((n) => [n.node_id, n]));

    const selectedInputs =
      ((run.summary_json?.selectedInputs as string[] | undefined) ?? []).filter(Boolean);

    const ctx: ExecutionContext = {
      runId: run.id,
      workspaceId: run.workspace_id,
      selectedInputs,
    };

    for (const node of sortedNodes) {
      const runNode = byNodeId.get(node.id);
      if (!runNode) {
        continue;
      }

      if (runNode.status === "succeeded") {
        continue;
      }

      if (runNode.status === "waiting_review") {
        await patchRun(run.id, { status: "waiting_review" });
        return;
      }

      await patchRunNode(runNode.id, {
        status: "running",
        started_at: runNode.started_at ?? new Date().toISOString(),
      });

      if (node.type === "review_gate") {
        await patchRunNode(runNode.id, {
          status: "waiting_review",
          output_json: { message: "Awaiting manual approval" },
          finished_at: null,
        });
        await patchRun(run.id, { status: "waiting_review" });
        return;
      }

      try {
        const output = await executeNode(node, ctx, runNodes);
        await patchRunNode(runNode.id, {
          status: "succeeded",
          output_json: output,
          finished_at: new Date().toISOString(),
          error_text: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown node error";
        await patchRunNode(runNode.id, {
          status: "failed",
          error_text: message,
          finished_at: new Date().toISOString(),
        });
        await patchRun(run.id, {
          status: "failed",
          finished_at: new Date().toISOString(),
          summary_json: { ...(run.summary_json ?? {}), error: message },
        });
        return;
      }
    }

    const artifacts = await getArtifacts(run.id);
    await patchRun(run.id, {
      status: "succeeded",
      finished_at: new Date().toISOString(),
      summary_json: {
        ...(run.summary_json ?? {}),
        artifactCount: artifacts.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run error";
    await patchRun(runId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      summary_json: { error: message },
    });
  } finally {
    running.delete(runId);
  }
}

export async function approveRun(runId: string, notes?: string) {
  const nodes = await getRunNodes(runId);
  const waiting = nodes.find((n) => n.status === "waiting_review");
  if (!waiting) {
    throw new Error("No node waiting for review");
  }

  await patchRunNode(waiting.id, {
    status: "succeeded",
    finished_at: new Date().toISOString(),
    output_json: {
      ...(waiting.output_json ?? {}),
      reviewNotes: notes ?? "",
      approvedAt: new Date().toISOString(),
    },
  });

  await patchRun(runId, { status: "running" });
  void executeRun(runId);
}

export async function requestRunEdits(runId: string, notes: string) {
  const nodes = await getRunNodes(runId);
  const waiting = nodes.find((n) => n.status === "waiting_review");
  if (!waiting) {
    throw new Error("No node waiting for review");
  }

  await patchRunNode(waiting.id, {
    output_json: {
      ...(waiting.output_json ?? {}),
      editNotes: notes,
      editRequestedAt: new Date().toISOString(),
    },
  });

  for (const node of nodes) {
    if (["generate_memo", "generate_deck"].includes(node.type)) {
      await patchRunNode(node.id, {
        status: "queued",
        started_at: null,
        finished_at: null,
      });
    }
  }

  await patchRunNode(waiting.id, {
    status: "succeeded",
    finished_at: new Date().toISOString(),
  });
  await patchRun(runId, { status: "running" });
  void executeRun(runId);
}

async function executeNode(node: WorkflowNode, ctx: ExecutionContext, runNodes: RunNodeRecord[]) {
  switch (node.type) {
    case "read_files":
      return executeReadFiles(node, ctx);
    case "summarize_with_citations":
      return executeSummarize(node, ctx);
    case "generate_memo":
      return executeMemo(node, ctx);
    case "extract_kpis":
      return executeKpis(node, ctx);
    case "generate_deck":
      return executeDeck(node, ctx);
    case "task_list":
      return executeTasks(node, ctx);
    case "export_bundle":
      return executeBundle(node, ctx, runNodes);
    default:
      throw new Error(`Unsupported node type: ${String(node.type)}`);
  }
}

async function executeReadFiles(node: WorkflowNode, ctx: ExecutionContext) {
  const inputDir = resolveWorkspacePath(ctx.workspaceId, "inputs");
  const selected = new Set(ctx.selectedInputs);
  const entries = await readdir(inputDir, { withFileTypes: true });
  const fileSummaries: { path: string; size: number; preview: string }[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const rel = `inputs/${entry.name}`;
    if (selected.size > 0 && !selected.has(rel)) {
      continue;
    }

    const abs = resolveWorkspacePath(ctx.workspaceId, rel);
    const s = await stat(abs);
    let preview = "";
    try {
      preview = (await readFile(abs, "utf8")).slice(0, 2000);
    } catch {
      preview = "[binary file content omitted]";
    }

    fileSummaries.push({
      path: rel,
      size: s.size,
      preview,
    });
  }

  const outPath = await writeJsonArtifact(ctx.workspaceId, ctx.runId, `${node.id}_read_files.json`, {
    files: fileSummaries,
  });

  return { files: fileSummaries.map((f) => f.path), outputPath: outPath };
}

async function executeSummarize(node: WorkflowNode, ctx: ExecutionContext) {
  const payload = {
    workspaceId: ctx.workspaceId,
    runId: ctx.runId,
    inputs: ctx.selectedInputs,
    mode: node.config?.mode ?? "standard",
  };

  const result = await callOpenClaw<{
    sections?: { title: string; bullets: string[]; citations?: string[] }[];
    citations?: { filePath: string; pageNumber?: number; excerpt: string; claimId?: string }[];
  }>("summarize_with_citations", payload);

  const sections = result.sections ?? [];
  const citations = result.citations ?? [];

  if (citations.length > 0) {
    await createCitations(
      citations.map((citation) => ({
        id: randomUUID(),
        run_id: ctx.runId,
        node_id: node.id,
        file_path: citation.filePath,
        page_number: citation.pageNumber ?? null,
        excerpt: citation.excerpt,
        claim_id: citation.claimId ?? null,
      })),
    );
  }

  const outPath = await writeJsonArtifact(ctx.workspaceId, ctx.runId, `${node.id}_summary.json`, {
    sections,
    citations,
  });

  await createArtifacts([
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "sources_json",
      path: outPath,
      metadata_json: { nodeId: node.id },
    },
  ]);

  return { sections, citationsCount: citations.length, outputPath: outPath };
}

async function executeMemo(node: WorkflowNode, ctx: ExecutionContext) {
  const payload = {
    workspaceId: ctx.workspaceId,
    runId: ctx.runId,
    inputs: ctx.selectedInputs,
    style: node.config?.style ?? "client-ready",
  };

  const result = await callOpenClaw<{ memoMarkdown?: string }>("memo_generation", payload);
  const memo =
    result.memoMarkdown ??
    "# Executive Summary\n\nOpenClaw returned an empty memo payload for this run.";

  const memoPath = await writeTextArtifact(ctx.workspaceId, ctx.runId, "memo.md", memo);

  await createArtifacts([
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "memo_md",
      path: memoPath,
      metadata_json: { nodeId: node.id },
    },
  ]);

  return { outputPath: memoPath };
}

async function executeKpis(node: WorkflowNode, ctx: ExecutionContext) {
  const payload = {
    workspaceId: ctx.workspaceId,
    runId: ctx.runId,
    inputs: ctx.selectedInputs,
  };

  const result = await callOpenClaw<{ rows?: Record<string, string | number | null>[] }>(
    "kpi_extraction",
    payload,
  );
  const rows = result.rows ?? [];

  const csvPath = await writeCsvArtifact(ctx.workspaceId, ctx.runId, "kpis.csv", rows);
  const jsonPath = await writeJsonArtifact(ctx.workspaceId, ctx.runId, "kpis.json", { rows });

  await createArtifacts([
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "kpis_csv",
      path: csvPath,
      metadata_json: { nodeId: node.id },
    },
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "kpis_json",
      path: jsonPath,
      metadata_json: { nodeId: node.id },
    },
  ]);

  return { rows: rows.length, csvPath, jsonPath };
}

async function executeDeck(node: WorkflowNode, ctx: ExecutionContext) {
  const payload = {
    workspaceId: ctx.workspaceId,
    runId: ctx.runId,
    inputs: ctx.selectedInputs,
  };

  const result = await callOpenClaw<{ outline?: string[] }>("deck_outline", payload);
  const outline = result.outline ?? [];

  // Placeholder deck artifact for MVP without extra binary dependencies.
  const deckText = [
    "Workflow Autopilot Deck (MVP Placeholder)",
    "",
    ...outline.map((slide, idx) => `Slide ${idx + 1}: ${slide}`),
  ].join("\n");

  const deckPath = await writeTextArtifact(ctx.workspaceId, ctx.runId, "deck.pptx", deckText);

  await createArtifacts([
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "deck_pptx",
      path: deckPath,
      metadata_json: { nodeId: node.id, placeholder: true },
    },
  ]);

  return { outputPath: deckPath, slides: outline.length };
}

async function executeTasks(node: WorkflowNode, ctx: ExecutionContext) {
  const payload = {
    workspaceId: ctx.workspaceId,
    runId: ctx.runId,
    inputs: ctx.selectedInputs,
  };

  const result = await callOpenClaw<{ tasks?: { title: string; priority?: string }[] }>(
    "task_list",
    payload,
  );

  const tasks = result.tasks ?? [];
  const tasksPath = await writeJsonArtifact(ctx.workspaceId, ctx.runId, "tasks.json", { tasks });

  await createArtifacts([
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "tasks_json",
      path: tasksPath,
      metadata_json: { nodeId: node.id },
    },
  ]);

  return { outputPath: tasksPath, count: tasks.length };
}

async function executeBundle(node: WorkflowNode, ctx: ExecutionContext, runNodes: RunNodeRecord[]) {
  const outputsDir = resolveWorkspacePath(ctx.workspaceId, `runs/${ctx.runId}/outputs`);
  const entries = await readdir(outputsDir, { withFileTypes: true });

  const included = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();

  const bundleManifestPath = await writeJsonArtifact(ctx.workspaceId, ctx.runId, "bundle_manifest.json", {
    generatedAt: new Date().toISOString(),
    fromNode: node.id,
    included,
    runNodeStatuses: runNodes.map((n) => ({ node: n.node_id, status: n.status })),
  });

  await createArtifacts([
    {
      id: randomUUID(),
      run_id: ctx.runId,
      type: "bundle_zip",
      path: bundleManifestPath,
      metadata_json: { nodeId: node.id, note: "Manifest placeholder for MVP zip" },
    },
  ]);

  const logPath = resolveWorkspacePath(ctx.workspaceId, `runs/${ctx.runId}/logs/export_bundle.log`);
  await writeFile(logPath, `Included files:\n${included.join("\n")}`, "utf8");

  return { outputPath: bundleManifestPath, includedCount: included.length };
}

export function getDownloadMime(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".json":
      return "application/json";
    case ".csv":
      return "text/csv";
    case ".md":
      return "text/markdown";
    case ".txt":
      return "text/plain";
    case ".pdf":
      return "application/pdf";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return "application/octet-stream";
  }
}
