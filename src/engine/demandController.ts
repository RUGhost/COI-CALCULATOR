import { EngineNode, EngineEdge } from "./types";

export function propagateDemands(nodes: EngineNode[], edges: EngineEdge[]): EngineNode[] {
  const nodeMap: Record<string, EngineNode> = {};
  nodes.forEach((n) => (nodeMap[n.id] = JSON.parse(JSON.stringify(n)))); // Deep clone to avoid mutation bugs

  // 1. Calculate new demand for every output based on connections
  Object.values(nodeMap).forEach((node) => {
    node.data.outputs.forEach((o: any) => {
      const outgoingEdges = edges.filter(
        (e) => e.source === node.id && e.material === o.material.name
      );

      // If connected, sum up what targets actually need
      if (outgoingEdges.length > 0) {
        let totalDemand = 0;
        outgoingEdges.forEach((e) => {
          const targetNode = nodeMap[e.target];
          const input = targetNode?.data.inputs.find((i: any) => i.material.name === o.material.name);
          if (input) totalDemand += input.rate;
        });
        o.rate = totalDemand;
      }
      // If NOT connected, we keep the user-defined rate (manual override)
    });

    // 2. Calculate the "Scale" needed to hit these output rates
    // If a node has multiple outputs, it scales to the most demanding one
    const scale = Math.max(
      ...node.data.outputs.map((out: any) => out.rate / (out.baseRate || 1)),
      0
    );

    // 3. Update machines and SYNC inputs
    // If demand for output is 0, machines become 0, and inputs become 0
    node.data.machines = Number(scale.toFixed(2));
    
    node.data.inputs.forEach((input: any) => {
      const baseIn = node.data.baseInputs.find((bi: any) => bi.material.name === input.material.name);
      if (baseIn) {
        input.rate = Number((baseIn.baseRate * scale).toFixed(2));
      }
    });
  });

  return Object.values(nodeMap);
}