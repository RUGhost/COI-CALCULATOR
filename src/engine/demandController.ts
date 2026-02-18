import { EngineNode, EngineEdge } from "./types";

export function propagateDemands(
  nodes: EngineNode[], 
  edges: EngineEdge[], 
  options?: {
    changedNodeId?: string;
    mode: 'full' | 'upstream-only';
  }
): EngineNode[] {
  // Deep clone
  const nodeMap: Record<string, EngineNode> = {};
  nodes.forEach((n) => (nodeMap[n.id] = JSON.parse(JSON.stringify(n))));

  if (options?.mode === 'upstream-only' && options.changedNodeId) {
    console.log(`🔼 Upstream-only propagation from ${options.changedNodeId}`);
    propagateUpstream(nodeMap, edges, options.changedNodeId);
  } else {
    console.log(`🔄 Full propagation in both directions`);
    propagateFull(nodeMap, edges);
  }

  return Object.values(nodeMap);
}

function propagateUpstream(
  nodeMap: Record<string, EngineNode>,
  edges: EngineEdge[],
  startNodeId: string
) {
  const visited = new Set<string>();
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    const currentNode = nodeMap[currentId];
    if (!currentNode) continue;
    
    console.log(`  Processing upstream node: ${currentId}`);
    
    const incomingEdges = edges.filter(e => e.target === currentId);
    
    for (const edge of incomingEdges) {
      const sourceNode = nodeMap[edge.source];
      if (!sourceNode) continue;
      
      console.log(`    Found incoming edge from ${sourceNode.id} (material: ${edge.material})`);
      
      // Skip if current node doesn't have inputs (like balancer nodes)
      if (!currentNode.data.inputs || !Array.isArray(currentNode.data.inputs)) {
        queue.push(edge.source);
        continue;
      }
      
      const targetInput = currentNode.data.inputs.find(
        (i: any) => i.material?.name === edge.material
      );
      
      if (targetInput) {
        // Skip if source node doesn't have outputs
        if (!sourceNode.data.outputs || !Array.isArray(sourceNode.data.outputs)) {
          queue.push(edge.source);
          continue;
        }
        
        const sourceOutput = sourceNode.data.outputs.find(
          (o: any) => o.material?.name === edge.material
        );
        
        if (sourceOutput) {
          if (Math.abs(sourceOutput.rate - targetInput.rate) > 0.01) {
            console.log(`      🔄 Updating ${sourceNode.id} ${edge.material} output: ${sourceOutput.rate} → ${targetInput.rate}`);
            sourceOutput.rate = targetInput.rate;
            
            // Recalculate source node's scale if it's a recipe node (has baseOutputs)
            if (sourceNode.data.baseOutputs && Array.isArray(sourceNode.data.baseOutputs)) {
              let maxScale = 0;
              sourceNode.data.outputs.forEach((output: any) => {
                if (output.baseRate > 0) {
                  const ratio = output.rate / output.baseRate;
                  maxScale = Math.max(maxScale, ratio);
                }
              });
              
              if (maxScale === 0) maxScale = sourceNode.data.machines;
              
              const newMachines = Number(maxScale.toFixed(2));
              if (Math.abs(sourceNode.data.machines - newMachines) > 0.01) {
                console.log(`      🔄 Updating ${sourceNode.id} machines: ${sourceNode.data.machines} → ${newMachines}`);
                sourceNode.data.machines = newMachines;
              }
              
              // Update source node's inputs if it has baseInputs
              if (sourceNode.data.baseInputs && Array.isArray(sourceNode.data.baseInputs)) {
                sourceNode.data.inputs.forEach((input: any) => {
                  const base = sourceNode.data.baseInputs.find(
                    (bi: any) => bi.material?.name === input.material?.name
                  );
                  if (base) {
                    const newRate = Number((base.baseRate * maxScale).toFixed(2));
                    if (Math.abs(input.rate - newRate) > 0.01) {
                      console.log(`      🔄 Updating ${sourceNode.id} input ${input.material.name}: ${input.rate} → ${newRate}`);
                      input.rate = newRate;
                    }
                  }
                });
              }
            }
          }
        }
      }
      
      queue.push(edge.source);
    }
  }
}

function propagateFull(nodeMap: Record<string, EngineNode>, edges: EngineEdge[]) {
  // First, identify which nodes have been manually overridden
  Object.values(nodeMap).forEach((node) => {
    // Check if this is a recipe node (has baseOutputs)
    if (node.data.baseOutputs && Array.isArray(node.data.baseOutputs)) {
      const expectedOutputs = node.data.baseOutputs.map((base: any) => ({
        ...base,
        rate: base.baseRate * node.data.machines
      }));
      
      const hasManualOverride = node.data.outputs?.some((output: any, index: number) => {
        const expected = expectedOutputs[index];
        return expected && Math.abs(output.rate - expected.rate) > 0.01;
      }) || false;
      
      node.data.hasManualOverride = hasManualOverride;
    } else {
      // Balancer node - never mark as manually overridden
      node.data.hasManualOverride = false;
    }
  });

  const maxIterations = Object.keys(nodeMap).length * 3;
  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n=== FULL PROPAGATION PASS ${i + 1} ===`);
    let hasChanged = false;

    // Calculate all downstream demands
    const downstreamDemands: Record<string, Record<string, number>> = {};

    Object.values(nodeMap).forEach((node) => {
      // Skip nodes without inputs (like balancer nodes with no inputs yet)
      if (!node.data.inputs || !Array.isArray(node.data.inputs)) {
        return;
      }
      
      node.data.inputs.forEach((input: any) => {
        if (!input?.material?.name) return;
        
        const incomingEdges = edges.filter(
          (e) => e.target === node.id && e.material === input.material.name
        );

        incomingEdges.forEach((edge) => {
          if (!downstreamDemands[edge.source]) {
            downstreamDemands[edge.source] = {};
          }
          if (!downstreamDemands[edge.source][input.material.name]) {
            downstreamDemands[edge.source][input.material.name] = 0;
          }
          
          downstreamDemands[edge.source][input.material.name] += input.rate;
        });
      });
    });

    // Update source nodes based on total downstream demand
    Object.entries(downstreamDemands).forEach(([sourceId, materialDemands]) => {
      const sourceNode = nodeMap[sourceId];
      if (!sourceNode || sourceNode.data.hasManualOverride) return;
      
      // Skip if source node doesn't have outputs
      if (!sourceNode.data.outputs || !Array.isArray(sourceNode.data.outputs)) return;

      Object.entries(materialDemands).forEach(([materialName, totalDemand]) => {
        const sourceOutput = sourceNode.data.outputs.find(
          (o: any) => o.material?.name === materialName
        );

        if (sourceOutput && Math.abs(sourceOutput.rate - totalDemand) > 0.01) {
          console.log(`  🔄 Updating ${sourceId} ${materialName} output: ${sourceOutput.rate} → ${totalDemand}`);
          sourceOutput.rate = totalDemand;
          hasChanged = true;
        }
      });
    });

    // Recalculate each node's scale and inputs
    Object.values(nodeMap).forEach((node) => {
      if (node.data.hasManualOverride) return;

      // Skip nodes without outputs
      if (!node.data.outputs || !Array.isArray(node.data.outputs)) return;

      // Check if this is a recipe node (has baseOutputs)
      if (node.data.baseOutputs && Array.isArray(node.data.baseOutputs)) {
        let maxScale = 0;
        node.data.outputs.forEach((output: any) => {
          if (output.baseRate > 0) {
            const ratio = output.rate / output.baseRate;
            maxScale = Math.max(maxScale, ratio);
          }
        });

        if (maxScale === 0) {
          maxScale = node.data.machines;
        }

        const newMachines = Number(maxScale.toFixed(2));
        
        if (Math.abs(node.data.machines - newMachines) > 0.01) {
          console.log(`  🔄 ${node.id} machines: ${node.data.machines} → ${newMachines}`);
          node.data.machines = newMachines;
          hasChanged = true;
        }

        // Update inputs only if node has inputs and baseInputs
        if (node.data.inputs && Array.isArray(node.data.inputs) && 
            node.data.baseInputs && Array.isArray(node.data.baseInputs)) {
          node.data.inputs.forEach((input: any) => {
            if (!input?.material?.name) return;
            
            const baseInput = node.data.baseInputs.find(
              (bi: any) => bi.material?.name === input.material.name
            );
            
            if (baseInput) {
              const expectedRate = Number((baseInput.baseRate * maxScale).toFixed(2));
              if (Math.abs(input.rate - expectedRate) > 0.01) {
                console.log(`  🔄 ${node.id} input ${input.material.name}: ${input.rate} → ${expectedRate}`);
                input.rate = expectedRate;
                hasChanged = true;
              }
            }
          });
        }
      } else {
        console.log(`  ⚖️ ${node.id} is a balancer, skipping scale calculation`);
      }
    });

    console.log(`Pass ${i + 1} complete, hasChanged: ${hasChanged}`);
    if (!hasChanged) {
      console.log("=== EQUILIBRIUM REACHED ===\n");
      break;
    }
  }
}