import { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange
} from "reactflow";
import "reactflow/dist/style.css";

import StartScreen from "./components/StartScreen";
import MaterialSelector from "./components/MaterialSelector";
import RecipeList from "./components/RecipeList";
import { nodeTypes } from "./flow/nodeTypes";

export default function App() {
  const [started, setStarted] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  // Initialize nodes and edges with proper state handlers
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const deleteNode = (id: string) => {
    setNodes(nodes => nodes.filter(n => n.id !== id));
  };

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <MaterialSelector onSelect={setSelectedMaterial} />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodeDragThreshold={1}
          onNodesChange={onNodesChange} // REQUIRED for dragging
          onEdgesChange={onEdgesChange} // REQUIRED for edge updates
          onConnect={onConnect}         // REQUIRED for connecting nodes
          deleteKeyCode="Delete"
          fitView
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
          />
        </ReactFlow>
      </div>

      <RecipeList
        materialName={selectedMaterial}
        onRecipeClick={recipe =>
          setNodes(ns => [
            ...ns,
            {
              id: crypto.randomUUID(),
              type: "recipeNode",
              position: {
                x: 150 + ns.length * 40,
                y: 100 + ns.length * 40
              },
              data: {
                ...recipe,
                onDelete: deleteNode
              }
            }
          ])
        }
      />
    </div>
  );
}
