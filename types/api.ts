import type {
  ArtifactRecord,
  ListedFile,
  RunNodeRecord,
  RunRecord,
  WorkflowRecord,
  WorkspaceRecord,
} from "@/types/workflow";

export type ApiError = { error: string };

export type WorkspacesResponse = { workspaces: WorkspaceRecord[] };

export type FilesResponse = { files: ListedFile[] };

export type WorkflowsResponse = { workflows: WorkflowRecord[] };

export type RunsResponse = { runs: RunRecord[] };

export type RunDetailResponse = {
  run: RunRecord;
  workflow: WorkflowRecord;
  nodes: RunNodeRecord[];
};

export type ArtifactsResponse = { artifacts: ArtifactRecord[] };
