import { Graph } from "./types";

export function buildGraph(nodes: any[], edges: any[]): Graph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      data: structuredClone(n.data),
    })),
    edges: edges.map((e) => ({
      source: e.source,
      target: e.target,
      material: e.data?.material || e.label || "", // flexible mapping
    })),
  };
}
