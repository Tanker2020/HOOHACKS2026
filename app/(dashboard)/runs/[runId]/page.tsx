"use client";

import { useEffect, useState } from "react";

type RunNode = {
  id: string;
  node_id: string;
  type: string;
  name: string;
  status: string;
  error_text: string | null;
  output_json: Record<string, unknown> | null;
};

type RunDetail = {
  run: {
    id: string;
    status: string;
  };
  nodes: RunNode[];
};

export default function RunDetailPage({
  params,
}: {
  params: { runId: string } | Promise<{ runId: string }>;
}) {
  const [runId, setRunId] = useState("");
  const [data, setData] = useState<RunDetail | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    void Promise.resolve(params).then((p) => setRunId(p.runId));
  }, [params]);

  useEffect(() => {
    if (!runId) {
      return;
    }

    let active = true;
    async function load() {
      const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
      const json = (await res.json()) as RunDetail;
      if (active) {
        setData(json);
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
  }, [runId]);

  async function approve() {
    await fetch(`/api/runs/${runId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function requestEdits() {
    await fetch(`/api/runs/${runId}/request-edits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  if (!data) {
    return <div className="card">Loading run...</div>;
  }

  const waiting = data.nodes.find((n) => n.status === "waiting_review");

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Run {runId.slice(0, 8)}</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            Current status: <span className="badge">{data.run.status}</span>
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Node Timeline</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Node</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.nodes.map((node) => (
                <tr key={node.id}>
                  <td>{node.name}</td>
                  <td className="mono">{node.type}</td>
                  <td>
                    <span className="badge">{node.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Logs / Output</h3>
          <div style={{ maxHeight: 380, overflow: "auto", display: "grid", gap: 10 }}>
            {data.nodes.map((node) => (
              <div key={node.id} className="card" style={{ boxShadow: "none" }}>
                <div style={{ fontWeight: 700 }}>{node.name}</div>
                {node.error_text ? <div style={{ color: "#a51616" }}>{node.error_text}</div> : null}
                <pre className="mono" style={{ fontSize: 12 }}>
                  {JSON.stringify(node.output_json ?? {}, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>
      </div>

      {waiting ? (
        <section className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Review Gate</h3>
          <p>This run is paused. Approve to continue or request edits to regenerate draft outputs.</p>
          <textarea
            className="textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Review notes"
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="button primary" onClick={approve}>
              Approve & Resume
            </button>
            <button className="button secondary" onClick={requestEdits}>
              Request Edits
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
