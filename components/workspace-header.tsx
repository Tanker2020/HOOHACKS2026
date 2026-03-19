"use client";

import { useEffect, useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
};

export function useWorkspaceState() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/workspaces", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          workspaces?: Workspace[];
          error?: string;
        };

        if (!res.ok) {
          setWorkspaces([]);
          setWorkspaceId("");
          setError(data.error ?? "Failed to load workspaces");
          return;
        }

        const list = data.workspaces ?? [];
        setWorkspaces(list);
        setError("");

        const stored = localStorage.getItem("workspaceId");
        const initial =
          list.find((w) => w.id === stored)?.id ?? list[0]?.id ?? "";
        setWorkspaceId(initial);
        if (initial) {
          localStorage.setItem("workspaceId", initial);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const selected = useMemo(
    () => workspaces.find((w) => w.id === workspaceId) ?? null,
    [workspaces, workspaceId],
  );

  const createWorkspace = async (name: string) => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { workspace?: Workspace; error?: string };
    if (!res.ok || !data.workspace) {
      throw new Error(data.error ?? "Failed to create workspace");
    }

    const next = [data.workspace, ...workspaces];
    setWorkspaces(next);
    setWorkspaceId(data.workspace.id);
    setError("");
    localStorage.setItem("workspaceId", data.workspace.id);
    return data.workspace;
  };

  const onWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    localStorage.setItem("workspaceId", id);
  };

  return {
    loading,
    workspaces,
    workspaceId,
    selected,
    error,
    createWorkspace,
    onWorkspaceChange,
  };
}

type Props = {
  title: string;
  subtitle?: string;
  error?: string;
  workspaceId: string;
  workspaces: Workspace[];
  onWorkspaceChange: (id: string) => void;
  onCreateWorkspace: (name: string) => Promise<unknown>;
  rightSlot?: React.ReactNode;
};

export function WorkspaceHeader({
  title,
  subtitle,
  error,
  workspaceId,
  workspaces,
  onWorkspaceChange,
  onCreateWorkspace,
  rightSlot,
}: Props) {
  const [newName, setNewName] = useState("");

  return (
    <div className="topbar">
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
        {subtitle ? <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{subtitle}</p> : null}
        {error ? (
          <p style={{ margin: "4px 0 0", color: "#b42318", fontSize: 13 }}>
            Workspace load error: {error}
          </p>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          className="select"
          value={workspaceId}
          onChange={(e) => onWorkspaceChange(e.target.value)}
          style={{ minWidth: 230 }}
        >
          <option value="">Select workspace</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="New workspace"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ width: 180 }}
        />
        <button
          className="button secondary"
          onClick={async () => {
            const name = newName.trim();
            if (!name) {
              return;
            }
            await onCreateWorkspace(name);
            setNewName("");
          }}
        >
          Create
        </button>
        {rightSlot}
      </div>
    </div>
  );
}
