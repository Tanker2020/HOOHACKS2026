"use client";

import { useMemo, useState } from "react";
import { TEMPLATE_GRAPHS } from "@/data/templates";
import { WorkspaceHeader, useWorkspaceState } from "@/components/workspace-header";
import type { WorkflowGraph } from "@/types/workflow";

const templates = [
  {
    id: "proposal_deck",
    name: "Client Brief -> Proposal Deck",
    description: "Proposal memo, review gate, deck, tasks, and bundle.",
  },
  {
    id: "investment_memo",
    name: "10-K -> Investment Memo",
    description: "KPI extraction, memo draft, review gate, deck summary.",
  },
  {
    id: "diligence",
    name: "Data Room -> Diligence Checklist",
    description: "Red flags summary, checklist, review, and memo export.",
  },
];

type WorkflowRecord = {
  id: string;
  name: string;
  graph_json: WorkflowGraph;
};

export default function WorkflowsPage() {
  const workspace = useWorkspaceState();
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0].id);
  const [workflowName, setWorkflowName] = useState("Demo Workflow");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<{ path: string; name: string }[]>([]);
  const [savedWorkflow, setSavedWorkflow] = useState<WorkflowRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");

  const graph = useMemo(() => TEMPLATE_GRAPHS[activeTemplate], [activeTemplate]);

  async function refreshFiles(workspaceId: string) {
    if (!workspaceId) {
      setFiles([]);
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/files?dir=inputs`, { cache: "no-store" });
    const data = (await res.json()) as { files: { path: string; name: string }[] };
    setFiles(data.files ?? []);
  }

  async function saveWorkflow() {
    if (!workspace.workspaceId) {
      return;
    }
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.workspaceId,
        name: workflowName,
        description: "Saved from template",
        graphJson: graph,
      }),
    });

    const data = (await res.json()) as { workflow?: WorkflowRecord; error?: string };
    if (!res.ok || !data.workflow) {
      throw new Error(data.error ?? "Failed to save workflow");
    }
    setSavedWorkflow(data.workflow);
    setStatus("Workflow saved");
  }

  async function runWorkflow() {
    if (!workspace.workspaceId) {
      return;
    }
    let workflowId = savedWorkflow?.id;
    if (!workflowId) {
      await saveWorkflow();
      workflowId = savedWorkflow?.id;
    }

    if (!workflowId) {
      const listRes = await fetch(`/api/workflows?workspaceId=${workspace.workspaceId}`, { cache: "no-store" });
      const listData = (await listRes.json()) as { workflows: WorkflowRecord[] };
      workflowId = listData.workflows[0]?.id;
    }

    if (!workflowId) {
      throw new Error("No workflow available to run");
    }

    setRunning(true);
    setStatus("Running");
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.workspaceId,
        workflowId,
        selectedInputs: selectedFiles,
      }),
    });

    const data = (await res.json()) as { run?: { id: string } };
    setRunning(false);
    if (data.run?.id) {
      setStatus(`Run started: ${data.run.id.slice(0, 8)}`);
    }
  }

  return (
    <div>
      <WorkspaceHeader
        title="Workflows"
        subtitle="Template-driven DAG builder with shared-volume inputs"
        error={workspace.error}
        workspaceId={workspace.workspaceId}
        workspaces={workspace.workspaces}
        onWorkspaceChange={(id) => {
          workspace.onWorkspaceChange(id);
          void refreshFiles(id);
        }}
        onCreateWorkspace={async (name) => {
          const created = await workspace.createWorkspace(name);
          await refreshFiles(created.id);
        }}
        rightSlot={
          <button className="button primary" onClick={runWorkflow} disabled={running || !workspace.workspaceId}>
            {running ? "Starting..." : "Run Workflow"}
          </button>
        }
      />

      <div className="grid-3">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Templates</h3>
          {templates.map((t) => (
            <button
              key={t.id}
              className="button"
              style={{ width: "100%", marginBottom: 8, textAlign: "left" }}
              onClick={() => setActiveTemplate(t.id)}
            >
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{t.description}</div>
            </button>
          ))}
        </section>

        <section className="card" style={{ gridColumn: "span 2" }}>
          <h3 style={{ marginTop: 0 }}>Workflow Canvas (MVP graph)</h3>
          <div className="grid-2">
            <div>
              <label>Workflow name</label>
              <input
                className="input"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
              />
            </div>
            <div>
              <label>Status</label>
              <div className="badge">{status}</div>
            </div>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Node</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {graph.nodes.map((node) => (
                <tr key={node.id}>
                  <td>{node.name}</td>
                  <td className="mono">{node.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="button secondary" onClick={saveWorkflow}>
              Save Workflow
            </button>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Node Inspector: Input Files</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Pick input files from <span className="mono">inputs/</span> in the shared workspace mount.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {files.map((f) => {
            const checked = selectedFiles.includes(f.path);
            return (
              <label key={f.path} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedFiles((current) =>
                      e.target.checked
                        ? [...current, f.path]
                        : current.filter((p) => p !== f.path),
                    );
                  }}
                />
                <span>{f.name}</span>
                <span className="mono" style={{ color: "var(--muted)" }}>
                  {f.path}
                </span>
              </label>
            );
          })}
          {files.length === 0 ? <div>No files found. Upload on Files page.</div> : null}
        </div>
      </section>
    </div>
  );
}
