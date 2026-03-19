import type { WorkflowGraph } from "@/types/workflow";

export const TEMPLATE_GRAPHS: Record<string, WorkflowGraph> = {
  proposal_deck: {
    nodes: [
      { id: "read", type: "read_files", name: "Read Files" },
      {
        id: "summarize",
        type: "summarize_with_citations",
        name: "Summarize with Citations",
      },
      { id: "memo", type: "generate_memo", name: "Generate Memo" },
      { id: "review", type: "review_gate", name: "Review Gate" },
      { id: "deck", type: "generate_deck", name: "Generate Deck" },
      { id: "tasks", type: "task_list", name: "Task List" },
      { id: "bundle", type: "export_bundle", name: "Export Bundle" },
    ],
    edges: [
      { from: "read", to: "summarize" },
      { from: "summarize", to: "memo" },
      { from: "memo", to: "review" },
      { from: "review", to: "deck" },
      { from: "deck", to: "tasks" },
      { from: "tasks", to: "bundle" },
    ],
  },
  investment_memo: {
    nodes: [
      { id: "read", type: "read_files", name: "Read Files" },
      { id: "kpis", type: "extract_kpis", name: "Extract KPIs" },
      {
        id: "summarize",
        type: "summarize_with_citations",
        name: "Summarize with Citations",
      },
      { id: "memo", type: "generate_memo", name: "Generate Memo" },
      { id: "review", type: "review_gate", name: "Review Gate" },
      { id: "deck", type: "generate_deck", name: "Generate Deck" },
      { id: "bundle", type: "export_bundle", name: "Export Bundle" },
    ],
    edges: [
      { from: "read", to: "kpis" },
      { from: "kpis", to: "summarize" },
      { from: "summarize", to: "memo" },
      { from: "memo", to: "review" },
      { from: "review", to: "deck" },
      { from: "deck", to: "bundle" },
    ],
  },
  diligence: {
    nodes: [
      { id: "read", type: "read_files", name: "Read Files" },
      {
        id: "summarize",
        type: "summarize_with_citations",
        name: "Red Flags Summary",
      },
      { id: "tasks", type: "task_list", name: "Diligence Checklist" },
      { id: "review", type: "review_gate", name: "Review Gate" },
      { id: "memo", type: "generate_memo", name: "Generate Memo" },
      { id: "bundle", type: "export_bundle", name: "Export Bundle" },
    ],
    edges: [
      { from: "read", to: "summarize" },
      { from: "summarize", to: "tasks" },
      { from: "tasks", to: "review" },
      { from: "review", to: "memo" },
      { from: "memo", to: "bundle" },
    ],
  },
};
