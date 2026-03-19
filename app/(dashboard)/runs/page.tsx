"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspaceHeader, useWorkspaceState } from "@/components/workspace-header";

type Run = {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
};

export default function RunsPage() {
  const workspace = useWorkspaceState();
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    if (!workspace.workspaceId) {
      return;
    }

    let active = true;
    async function load() {
      const res = await fetch(`/api/runs?workspaceId=${workspace.workspaceId}`, { cache: "no-store" });
      const data = (await res.json()) as { runs: Run[] };
      if (active) {
        setRuns(data.runs ?? []);
      }
    }

    void load();
    const timer = setInterval(load, 1500);

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [workspace.workspaceId]);

  return (
    <div>
      <WorkspaceHeader
        title="Runs"
        subtitle="Live run status with review-gate awareness"
        error={workspace.error}
        workspaceId={workspace.workspaceId}
        workspaces={workspace.workspaces}
        onWorkspaceChange={workspace.onWorkspaceChange}
        onCreateWorkspace={workspace.createWorkspace}
      />

      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Status</th>
              <th>Started</th>
              <th>Finished</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td className="mono">{run.id.slice(0, 8)}</td>
                <td>
                  <span className="badge">{run.status}</span>
                </td>
                <td>{run.started_at ? new Date(run.started_at).toLocaleString() : "-"}</td>
                <td>{run.finished_at ? new Date(run.finished_at).toLocaleString() : "-"}</td>
                <td>
                  <Link href={`/runs/${run.id}`} className="button secondary">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 ? <p>No runs yet.</p> : null}
      </section>
    </div>
  );
}
