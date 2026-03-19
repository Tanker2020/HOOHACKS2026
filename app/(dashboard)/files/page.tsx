/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceHeader, useWorkspaceState } from "@/components/workspace-header";

type ListedFile = {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
};

export default function FilesPage() {
  const workspace = useWorkspaceState();
  const [files, setFiles] = useState<ListedFile[]>([]);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function refresh(workspaceId: string) {
    if (!workspaceId) {
      setFiles([]);
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/files?dir=inputs`, { cache: "no-store" });
    const data = (await res.json()) as { files: ListedFile[] };
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    if (workspace.workspaceId) {
      void refresh(workspace.workspaceId);
    }
  }, [workspace.workspaceId]);

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !workspace.workspaceId) {
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/workspaces/${workspace.workspaceId}/files/upload`, {
      method: "POST",
      body: form,
    });

    setUploading(false);
    if (res.ok) {
      await refresh(workspace.workspaceId);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  async function previewFile(path: string) {
    if (!workspace.workspaceId) {
      return;
    }
    const res = await fetch(
      `/api/workspaces/${workspace.workspaceId}/files/view?path=${encodeURIComponent(path)}`,
      { cache: "no-store" },
    );

    const text = await res.text();
    setPreview(text.slice(0, 10000));
  }

  return (
    <div>
      <WorkspaceHeader
        title="Files"
        subtitle="Native upload/list/preview for shared workspace inputs"
        error={workspace.error}
        workspaceId={workspace.workspaceId}
        workspaces={workspace.workspaces}
        onWorkspaceChange={(id) => {
          workspace.onWorkspaceChange(id);
          void refresh(id);
        }}
        onCreateWorkspace={async (name) => {
          const ws = await workspace.createWorkspace(name);
          await refresh(ws.id);
        }}
      />

      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Upload to inputs/</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input ref={fileRef} type="file" className="input" />
            <button className="button primary" onClick={onUpload} disabled={uploading || !workspace.workspaceId}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p style={{ color: "var(--muted)" }}>
            Files are stored under <span className="mono">workspaces/&lt;id&gt;/inputs/</span> and are visible
            to OpenClaw and Filestash.
          </p>

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.path}>
                  <td>{file.name}</td>
                  <td>{Math.round(file.size / 1024)} KB</td>
                  <td>{new Date(file.modifiedAt).toLocaleString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="button secondary" onClick={() => previewFile(file.path)}>
                        Preview
                      </button>
                      <a
                        className="button"
                        href={`/api/workspaces/${workspace.workspaceId}/files/download?path=${encodeURIComponent(file.path)}`}
                      >
                        Download
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {files.length === 0 ? <p>No files uploaded yet.</p> : null}
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Preview</h3>
          <pre className="mono" style={{ fontSize: 12, maxHeight: 560, overflow: "auto" }}>
            {preview || "Pick a file to preview."}
          </pre>
        </section>
      </div>
    </div>
  );
}
