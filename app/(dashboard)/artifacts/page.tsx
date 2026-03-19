"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspaceHeader, useWorkspaceState } from "@/components/workspace-header";

type Run = { id: string; status: string; started_at: string | null };
type Artifact = { id: string; type: string; path: string; metadata_json: Record<string, unknown> | null };

export default function ArtifactsPage() {
  const workspace = useWorkspaceState();
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (!workspace.workspaceId) {
      return;
    }

    async function loadRuns() {
      const res = await fetch(`/api/runs?workspaceId=${workspace.workspaceId}`, { cache: "no-store" });
      const data = (await res.json()) as { runs: Run[] };
      setRuns(data.runs ?? []);
      if (!runId && data.runs?.[0]?.id) {
        setRunId(data.runs[0].id);
      }
    }

    void loadRuns();
  }, [workspace.workspaceId, runId]);

  useEffect(() => {
    if (!runId) {
      return;
    }

    async function loadArtifacts() {
      const res = await fetch(`/api/artifacts?runId=${runId}`, { cache: "no-store" });
      const data = (await res.json()) as { artifacts: Artifact[] };
      setArtifacts(data.artifacts ?? []);
    }

    void loadArtifacts();
  }, [runId]);

  const byType = useMemo(() => {
    return artifacts.reduce<Record<string, Artifact[]>>((acc, item) => {
      acc[item.type] = [...(acc[item.type] ?? []), item];
      return acc;
    }, {});
  }, [artifacts]);

  async function viewArtifact(artifactId: string) {
    const res = await fetch(`/api/artifacts/${artifactId}/view`, { cache: "no-store" });
    const text = await res.text();
    setPreview(text);
  }

  return (
    <div>
      <WorkspaceHeader
        title="Artifacts"
        subtitle="View and download generated outputs from shared workspace"
        error={workspace.error}
        workspaceId={workspace.workspaceId}
        workspaces={workspace.workspaces}
        onWorkspaceChange={workspace.onWorkspaceChange}
        onCreateWorkspace={workspace.createWorkspace}
      />

      <section className="card" style={{ marginBottom: 12 }}>
        <label>Run</label>
        <select className="select" value={runId} onChange={(e) => setRunId(e.target.value)}>
          <option value="">Select run</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id.slice(0, 8)} - {r.status}
            </option>
          ))}
        </select>
      </section>

      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Artifact Grid</h3>
          {Object.entries(byType).map(([type, items]) => (
            <div key={type} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{type}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 12, flex: 1 }}>
                      {item.path}
                    </span>
                    <button className="button secondary" onClick={() => viewArtifact(item.id)}>
                      View
                    </button>
                    <a className="button" href={`/api/artifacts/${item.id}/download`}>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {artifacts.length === 0 ? <p>No artifacts for selected run.</p> : null}
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Viewer</h3>
          <pre className="mono" style={{ fontSize: 12, maxHeight: 460, overflow: "auto" }}>
            {preview || "Select an artifact to preview."}
          </pre>
        </section>
      </div>
    </div>
  );
}
