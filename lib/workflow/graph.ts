import type { WorkflowGraph, WorkflowNode } from "@/types/workflow";

export function topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of graph.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of graph.edges) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }

  const queue = graph.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  const sorted: WorkflowNode[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const to of outgoing.get(current.id) ?? []) {
      incoming.set(to, (incoming.get(to) ?? 1) - 1);
      if ((incoming.get(to) ?? 0) === 0) {
        const node = nodeById.get(to);
        if (node) {
          queue.push(node);
        }
      }
    }
  }

  if (sorted.length !== graph.nodes.length) {
    throw new Error("Workflow graph must be a DAG");
  }

  return sorted;
}
