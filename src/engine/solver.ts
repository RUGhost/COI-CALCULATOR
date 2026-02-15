import { EngineNode, EngineEdge, Demand } from "./types";
import { scaleRecipe } from "../utils/scaleRecipe";

export function solveProduction(
  nodes: EngineNode[],
  edges: EngineEdge[],
  rootDemands: Demand[]
): EngineNode[] {

  // deep clone nodes
  const nodeMap = new Map<string, EngineNode>(
    nodes.map((n) => [n.id, structuredClone(n)])
  );

  // demand accumulator: nodeId_material => rate
  const demandMap = new Map<string, number>();

  // seed initial demands
  for (const d of rootDemands) {
    demandMap.set(`${d.nodeId}_${d.material}`, d.rate);
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of edges) {
      const demandKey = `${edge.target}_${edge.material}`;
      if (!demandMap.has(demandKey)) continue;

      const demand = demandMap.get(demandKey)!;
      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) continue;

      const output = sourceNode.data.outputs.find(
        (o: any) => o.material.name === edge.material
      );
      if (!output) continue;

      const baseRate = output.baseRate;

      // machines needed
      const machines = demand / baseRate;
      const produced = machines * baseRate;

      // scale source recipe
      const scaled = scaleRecipe(
        sourceNode.data,
        edge.material,
        produced
      );

      if (!scaled) continue;

      sourceNode.data = { ...sourceNode.data, ...scaled };

      // propagate new demands upstream
      for (const inp of sourceNode.data.inputs) {
        const key = `${sourceNode.id}_${inp.material.name}`;
        const prev = demandMap.get(key) || 0;

        if (Math.abs(prev - inp.rate) > 1e-6) {
          demandMap.set(key, inp.rate);
          changed = true;
        }
      }
    }
  }

  return Array.from(nodeMap.values());
}
