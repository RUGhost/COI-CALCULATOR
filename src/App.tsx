import { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";

import StartScreen from "./components/StartScreen";
import MaterialSelector from "./components/MaterialSelector";
import RecipeList from "./components/RecipeList";
import { nodeTypes } from "./flow/nodeTypes";
import { scaleRecipe } from "./utils/scaleRecipe";

export default function App() {
  const [started, setStarted] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Recursive function to update upstream nodes
  const updateUpstreamNodes = (nodeId: string, nds: any[], eds: any[]): any[] => {
    let updatedNodes = [...nds];
    const node = updatedNodes.find((n) => n.id === nodeId);
    if (!node) return updatedNodes;

    // For each input of this node
    node.data.inputs.forEach((input: any, index: number) => {
      // Find edges that provide this input
      const incomingEdges = eds.filter(
        (e) => e.target === nodeId && e.targetHandle === `${nodeId}-in-${index}`
      );

      incomingEdges.forEach((e) => {
        const sourceNode = updatedNodes.find((n) => n.id === e.source);
        if (!sourceNode) return;

        const sourceIndex = Number(e.sourceHandle?.split("-out-")[1]);
        if (isNaN(sourceIndex)) return;

        const sourceOutput = sourceNode.data.outputs[sourceIndex];
        if (!sourceOutput) return;

        // Get the current demand from the target node's input
        const targetInput = node.data.inputs[index];

        // Calculate how many machines the source node needs to meet this demand
        // For rubber maker: baseRate = 4 (produces 4 rubber per machine)
        // Demand = 18, so machines needed = 18/4 = 4.5
        const requiredMachines = targetInput.rate / sourceOutput.baseRate;

        // Scale the source node to produce enough for the demand
        const scaledData = scaleRecipe(
          sourceNode.data,
          sourceOutput.material.name,
          sourceOutput.baseRate * requiredMachines
        );

        if (scaledData) {
          console.log(`Updating ${sourceNode.data.machineName} to produce ${sourceOutput.baseRate * requiredMachines} ${sourceOutput.material.name}`);

          updatedNodes = updatedNodes.map((n) =>
            n.id === sourceNode.id
              ? { ...n, data: { ...n.data, ...scaledData } }
              : n
          );

          // Recursively update further upstream (if rubber maker has its own inputs)
          updatedNodes = updateUpstreamNodes(sourceNode.id, updatedNodes, eds);
        }
      });
    });

    return updatedNodes;
  };

  const updateOutputRate = (
  id: string,
  materialName: string,
  value: number,
  manualChange: boolean = true
) => {
  // First update the target node
  setNodes((currentNodes) => {
    const node = currentNodes.find((n) => n.id === id);
    if (!node) return currentNodes;

    const newData = scaleRecipe(node.data, materialName, value);
    if (!newData) return currentNodes;

    const updatedNodes = currentNodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
    );

    // If manual change, propagate upstream using current edges
    if (manualChange) {
      // Get the latest edges directly from state
      setEdges((currentEdges) => {
        // Update all upstream nodes recursively
        const propagateUpstream = (nodeId: string, nodes: any[], edges: any[]): any[] => {
          let updated = [...nodes];
          const targetNode = updated.find((n) => n.id === nodeId);
          if (!targetNode) return updated;

          // For each input of the target node
          targetNode.data.inputs.forEach((input: any, index: number) => {
            // Find connected source nodes
            const incomingEdges = edges.filter(
              (e) => e.target === nodeId && e.targetHandle === `${nodeId}-in-${index}`
            );

            incomingEdges.forEach((e) => {
              const sourceNode = updated.find((n) => n.id === e.source);
              if (!sourceNode) return;

              const sourceIndex = Number(e.sourceHandle?.split("-out-")[1]);
              if (isNaN(sourceIndex)) return;

              const sourceOutput = sourceNode.data.outputs[sourceIndex];
              if (!sourceOutput) return;

              // Calculate required machines based on demand
              const demand = targetNode.data.inputs[index].rate;
              const requiredMachines = demand / sourceOutput.baseRate;
              
              // Scale the source node
              const scaledData = scaleRecipe(
                sourceNode.data,
                sourceOutput.material.name,
                sourceOutput.baseRate * requiredMachines
              );

              if (scaledData) {
                updated = updated.map((n) =>
                  n.id === sourceNode.id
                    ? { ...n, data: { ...n.data, ...scaledData } }
                    : n
                );

                // Recursively update further upstream
                updated = propagateUpstream(sourceNode.id, updated, edges);
              }
            });
          });

          return updated;
        };

        // Apply all upstream updates
        const finalNodes = propagateUpstream(id, updatedNodes, currentEdges);
        
        // Update nodes with all changes
        setTimeout(() => {
          setNodes(finalNodes);
        }, 0);
        
        return currentEdges;
      });
    }

    return updatedNodes;
  });
};


  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));

      // After connecting, update upstream nodes to satisfy the new connection
      setNodes((nds) => {
        const targetNode = nds.find((n) => n.id === params.target);
        if (!targetNode) return nds;

        return updateUpstreamNodes(params.target!, nds, [...edges, params]);
      });
    },
    [edges]
  );

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <MaterialSelector onSelect={(value: string) => setSelectedMaterial(value)} />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode="Delete"
          fitView
          isValidConnection={(connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);
            if (!sourceNode || !targetNode) return false;

            const sourceIndex = Number(connection.sourceHandle?.split('-out-')[1]);
            const targetIndex = Number(connection.targetHandle?.split('-in-')[1]);
            if (isNaN(sourceIndex) || isNaN(targetIndex)) return false;

            const sourceMaterial = sourceNode.data.outputs[sourceIndex].material.name;
            const targetMaterial = targetNode.data.inputs[targetIndex].material.name;

            return sourceMaterial === targetMaterial;
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>

      <RecipeList
        materialName={selectedMaterial}
        onRecipeClick={(recipe) => {
          setNodes((ns) => [
            ...ns,
            {
              id: crypto.randomUUID(),
              type: "recipeNode",
              position: {
                x: 150 + ns.length * 40,
                y: 100 + ns.length * 40,
              },
              data: {
                machineName: recipe.machineName,
                machineLogo: recipe.machineLogo,
                baseInputs: recipe.inputs.map((i) => ({
                  ...i,
                  baseRate: i.rate,
                })),
                baseOutputs: recipe.outputs.map((o) => ({
                  ...o,
                  baseRate: o.rate,
                })),
                inputs: recipe.inputs.map((i) => ({
                  ...i,
                  baseRate: i.rate,
                })),
                outputs: recipe.outputs.map((o) => ({
                  ...o,
                  baseRate: o.rate,
                })),
                machines: 1,
                onDelete: deleteNode,
                onUpdateOutput: updateOutputRate,
              },
            },
          ]);
        }}
      />
    </div>
  );
}