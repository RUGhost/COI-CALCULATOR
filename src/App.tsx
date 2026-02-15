import { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";

import StartScreen from "./components/StartScreen";
import MaterialSelector from "./components/MaterialSelector";
import RecipeList from "./components/RecipeList";
import { nodeTypes } from "./flow/nodeTypes";

import { propagateDemands } from "./engine/demandController";
import { EngineEdge } from "./engine/types";

export default function App() {
  const [started, setStarted] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  /**
   * THE ENGINE
   * Processes the graph and updates demands across all connected nodes.
   */
  const runEngine = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      try {
        const engineNodes = currentNodes.map((n) => ({
          id: n.id,
          data: n.data,
        }));

        const engineEdges: EngineEdge[] = currentEdges.map((e) => {
          const sourceIndex = Number(e.sourceHandle?.split("-out-")[1]) || 0;
          const sourceNode = currentNodes.find((n) => n.id === e.source);
          const material = sourceNode?.data.outputs?.[sourceIndex]?.material?.name || "";
          return { source: e.source, target: e.target, material };
        });

        const solvedNodes = propagateDemands(engineNodes, engineEdges);

        setNodes((nds) =>
          nds.map((n) => {
            const solved = solvedNodes.find((s) => s.id === n.id);
            if (solved) {
              // KEEP the existing node properties (position, type, etc)
              // ONLY update the data object
              return {
                ...n,
                data: {
                  ...n.data,
                  ...solved.data
                }
              };
            }
            return n; // Keep nodes even if engine doesn't return them
          })
        );
      } catch (err) {
        console.error("Engine error:", err);
      }
    },
    [setNodes]
  );

  /**
   * MANUAL UPDATE HANDLER
   * Triggered by buttons/inputs in CustomRecipeNode.
   * It calculates the scale of the recipe and then runs the engine.
   */
 const onUpdateOutput = useCallback(
  (nodeId: string, materialName: string, newRate: number) => {
    setNodes((nds) => {
      // 1. Calculate the initial change for the node being edited
      const preSolvedNodes = nds.map((n) => {
        if (n.id === nodeId) {
          const baseOut = n.data.baseOutputs.find(
            (o: any) => o.material.name === materialName
          );
          const scale = baseOut ? newRate / baseOut.baseRate : 1;

          return {
            ...n,
            data: {
              ...n.data,
              machines: Number(scale.toFixed(2)),
              inputs: n.data.baseInputs.map((i: any) => ({
                ...i,
                rate: Number((i.baseRate * scale).toFixed(2)),
              })),
              outputs: n.data.baseOutputs.map((o: any) => ({
                ...o,
                rate: Number((o.baseRate * scale).toFixed(2)),
              })),
            },
          };
        }
        return n;
      });

      // 2. Prepare Engine Nodes (strip ReactFlow metadata)
      const engineNodes = preSolvedNodes.map((n) => ({
        id: n.id,
        data: n.data,
      }));

      // 3. Prepare Engine Edges (Add the missing 'material' property)
      const engineEdges: EngineEdge[] = edges.map((e) => {
        const sourceIndex = Number(e.sourceHandle?.split("-out-")[1]) || 0;
        const sourceNode = preSolvedNodes.find((n) => n.id === e.source);
        const material = sourceNode?.data.outputs?.[sourceIndex]?.material?.name || "";
        
        return { 
          source: e.source, 
          target: e.target, 
          material 
        };
      });

      // 4. Run the Engine
      const solvedEngineNodes = propagateDemands(engineNodes, engineEdges);

      // 5. Safe Merge back into ReactFlow nodes
      return preSolvedNodes.map((originalNode) => {
        const solved = solvedEngineNodes.find((s) => s.id === originalNode.id);
        if (solved) {
          return {
            ...originalNode,
            data: { ...originalNode.data, ...solved.data },
          };
        }
        return originalNode;
      });
    });
  },
  [edges, setNodes] // edges is needed here to map engineEdges
);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        runEngine(nodes, newEdges);
        return newEdges;
      });
    },
    [nodes, runEngine, setEdges]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const remainingNodes = nds.filter((n) => n.id !== id);
        setEdges((eds) => {
          const remainingEdges = eds.filter((e) => e.source !== id && e.target !== id);
          runEngine(remainingNodes, remainingEdges);
          return remainingEdges;
        });
        return remainingNodes;
      });
    },
    [runEngine, setEdges, setNodes]
  );

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
          onNodesDelete={(deleted) => {
            const deletedIds = new Set(deleted.map((d) => d.id));
            const remainingNodes = nodes.filter((n) => !deletedIds.has(n.id));
            const remainingEdges = edges.filter(
              (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
            );
            runEngine(remainingNodes, remainingEdges);
          }}
          deleteKeyCode="Delete"
          fitView
          isValidConnection={(connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);
            if (!sourceNode || !targetNode) return false;

            const sIdx = Number(connection.sourceHandle?.split("-out-")[1]);
            const tIdx = Number(connection.targetHandle?.split("-in-")[1]);

            const sMat = sourceNode.data.outputs[sIdx]?.material?.name;
            const tMat = targetNode.data.inputs[tIdx]?.material?.name;

            return sMat === tMat;
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>

      <RecipeList
        materialName={selectedMaterial}
        onRecipeClick={(recipe) => {
          const newNode = {
            id: `node_${Date.now()}`,
            type: "recipeNode",
            position: { x: 400, y: 100 },
            data: {
              machineName: recipe.machineName,
              machineLogo: recipe.machineLogo,
              baseInputs: recipe.inputs.map((i: any) => ({ ...i, baseRate: i.rate })),
              baseOutputs: recipe.outputs.map((o: any) => ({ ...o, baseRate: o.rate })),
              inputs: recipe.inputs.map((i: any) => ({ ...i, rate: i.rate })),
              outputs: recipe.outputs.map((o: any) => ({ ...o, rate: o.rate })),
              machines: 1,
              onDelete: deleteNode,
              onUpdateOutput: onUpdateOutput, // Critical link
            },
          };
          const newNodes = [...nodes, newNode];
          setNodes(newNodes);
          runEngine(newNodes, edges);
        }}
      />
    </div>
  );
}