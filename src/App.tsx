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
      console.log("🔵 runEngine called with:", {
        nodeCount: currentNodes.length,
        edgeCount: currentEdges.length,
        edges: currentEdges.map(e => ({ source: e.source, target: e.target, handle: e.sourceHandle }))
      });

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

        console.log("Engine edges with materials:", engineEdges);

        const solvedNodes = propagateDemands(engineNodes, engineEdges);

        console.log("Solved nodes from engine:", solvedNodes.map(n => ({
          id: n.id,
          machines: n.data.machines,
          outputs: n.data.outputs?.map((o: any) => ({ material: o.material.name, rate: o.rate })),
          inputs: n.data.inputs?.map((i: any) => ({ material: i.material.name, rate: i.rate }))
        })));

        setNodes((nds) =>
          nds.map((n) => {
            const solved = solvedNodes.find((s) => s.id === n.id);
            if (solved) {
              console.log(`Updating node ${n.id} with solved data`, solved.data);
              return {
                ...n,
                data: {
                  ...n.data,
                  ...solved.data
                }
              };
            }
            return n;
          })
        );
      } catch (err) {
        console.error("Engine error:", err);
      }
    },
    [setNodes]
  );

  /**
   * DELETE NODE HANDLER
   * Defined early because it's used by addBalancerNode
   */
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

  /**
   * MANUAL UPDATE HANDLER
   * Triggered by buttons/inputs in CustomRecipeNode.
   */
  const onUpdateOutput = useCallback(
    (nodeId: string, materialName: string, newRate: number, isUnlocked: boolean = false) => {
      setNodes((currentNodes) => {
        // 1. Manually update the node the user interacted with
        const updatedNodes = currentNodes.map((n) => {
          if (n.id === nodeId) {
            const output = n.data.outputs.find((o: any) => o.material.name === materialName);
            const baseOutput = n.data.baseOutputs.find((o: any) => o.material.name === materialName);

            if (!output || !baseOutput) return n;

            const scale = newRate / baseOutput.baseRate;

            return {
              ...n,
              data: {
                ...n.data,
                hasManualOverride: true,
                isUnlocked: isUnlocked,
                machines: Number(scale.toFixed(2)),
                outputs: n.data.baseOutputs.map((o: any) => ({
                  ...o,
                  rate: Number((o.baseRate * scale).toFixed(2)),
                })),
                inputs: n.data.baseInputs.map((i: any) => ({
                  ...i,
                  rate: Number((i.baseRate * scale).toFixed(2)),
                })),
              },
            };
          }
          return n;
        });

        setEdges((currentEdges) => {
          // 2. Prepare Edges with the updated nodes
          const engineEdges: EngineEdge[] = currentEdges.map((e) => {
            const sourceIndex = Number(e.sourceHandle?.split("-out-")[1]) || 0;
            const sourceNode = updatedNodes.find((n) => n.id === e.source);
            const material = sourceNode?.data.outputs[sourceIndex]?.material?.name || "";
            return { source: e.source, target: e.target, material };
          });

          // 3. Run the engine with the mode
          const engineNodes = updatedNodes.map(n => ({ id: n.id, data: n.data }));

          const solved = propagateDemands(engineNodes, engineEdges, {
            changedNodeId: nodeId,
            mode: isUnlocked ? 'upstream-only' : 'full'
          });

          // 4. Update nodes with engine results
          setNodes((prevNodes) => {
            return prevNodes.map((n) => {
              const solvedNode = solved.find((sn) => sn.id === n.id);
              if (solvedNode) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    ...solvedNode.data
                  }
                };
              }
              return n;
            });
          });

          return currentEdges;
        });

        return updatedNodes;
      });
    },
    []
  );

  const onToggleLock = useCallback((nodeId: string, isLocked: boolean) => {
    setNodes((currentNodes) => {
      return currentNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              isManualLocked: isLocked
            }
          };
        }
        return n;
      });
    });
  }, []);

  /**
   * BALANCER PORT CONNECTION HANDLER
   * Tracks which ports are connected and auto-expands when needed
   */
 /**
 * BALANCER PORT CONNECTION HANDLER - FIXED
 */
const onPortConnected = useCallback((
  nodeId: string,
  type: 'input' | 'output',
  index: number,
  connected: boolean
) => {
  console.log(`📞 onPortConnected called:`, { nodeId, type, index, connected });
  
  setNodes(nds => nds.map(node => {
    if (node.id === nodeId) {
      console.log(`Updating node ${nodeId} ports:`, { 
        before: { 
          inputs: node.data.connectedInputs, 
          outputs: node.data.connectedOutputs,
          inputPorts: node.data.inputPorts,
          outputPorts: node.data.outputPorts
        }
      });
      
      // Get current arrays
      const currentInputs = node.data.connectedInputs || [];
      const currentOutputs = node.data.connectedOutputs || [];

      // Ensure arrays are the right length
      while (currentInputs.length < node.data.inputPorts) {
        currentInputs.push(false);
      }
      while (currentOutputs.length < node.data.outputPorts) {
        currentOutputs.push(false);
      }

      // Create new arrays with updated connection
      const newInputs = [...currentInputs];
      const newOutputs = [...currentOutputs];

      if (type === 'input') {
        newInputs[index] = connected;
      } else {
        newOutputs[index] = connected;
      }

      // Check if we need to add a new port (only if this was the last port)
      if (type === 'input' && index === newInputs.length - 1 && connected) {
        if (node.data.inputPorts < 7) {
          newInputs.push(false);
          console.log(`➕ Adding new input port, now ${node.data.inputPorts + 1} total`);
          return {
            ...node,
            data: {
              ...node.data,
              inputPorts: node.data.inputPorts + 1,
              connectedInputs: newInputs,
              connectedOutputs: newOutputs,
            },
          };
        }
      } else if (type === 'output' && index === newOutputs.length - 1 && connected) {
        if (node.data.outputPorts < 7) {
          newOutputs.push(false);
          console.log(`➕ Adding new output port, now ${node.data.outputPorts + 1} total`);
          return {
            ...node,
            data: {
              ...node.data,
              outputPorts: node.data.outputPorts + 1,
              connectedInputs: newInputs,
              connectedOutputs: newOutputs,
            },
          };
        }
      }

      // Just update connection status
      console.log(`✅ Updated connection status:`, { newInputs, newOutputs });
      return {
        ...node,
        data: {
          ...node.data,
          connectedInputs: newInputs,
          connectedOutputs: newOutputs,
        },
      };
    }
    return node;
  }));
}, []);

/**
 * ADD BALANCER NODE - COMPLETELY FIXED
 */
/**
 * ADD BALANCER NODE - FIXED
 */
const addBalancerNode = useCallback(() => {
  const newNode = {
    id: `balancer_${Date.now()}`,
    type: "balancerNode",
    position: { x: 400, y: 300 },
    data: {
      inputPorts: 1,
      outputPorts: 1,
      material: null,
      connectedInputs: [false],
      connectedOutputs: [false],
      onDelete: deleteNode,
      // Pass the CURRENT nodes as a prop
      nodes: nodes,
      onMaterialDetermined: (nodeId: string, material: any) => {
        setNodes(nds => nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                material: material,
              },
            };
          }
          return node;
        }));
      },
      onPortConnected: onPortConnected,
    },
  };

  setNodes((nds) => [...nds, newNode]);
}, [deleteNode, nodes, setNodes, onPortConnected]);

  /**
   * CONNECTION HANDLER
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("🟢 onConnect triggered with params:", connection);

      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      // Handle material determination for balancers
      if (targetNode?.type === 'balancerNode' && !targetNode.data.material) {
        if (sourceNode?.type !== 'balancerNode') {
          const sourceIndex = Number(connection.sourceHandle?.split("-out-")[1]);
          const sourceMaterial = sourceNode?.data.outputs?.[sourceIndex]?.material;
          if (sourceMaterial) {
            setNodes(nds => nds.map(node => {
              if (node.id === connection.target) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    material: sourceMaterial,
                  },
                };
              }
              return node;
            }));
          }
        }
      } else if (sourceNode?.type === 'balancerNode' && !sourceNode.data.material) {
        if (targetNode?.type !== 'balancerNode') {
          const targetIndex = Number(connection.targetHandle?.split("-in-")[1]);
          const targetMaterial = targetNode?.data.inputs?.[targetIndex]?.material;
          if (targetMaterial) {
            setNodes(nds => nds.map(node => {
              if (node.id === connection.source) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    material: targetMaterial,
                  },
                };
              }
              return node;
            }));
          }
        }
      }

      // Check if this connection uses a balancer port that needs to be expanded
      setNodes((nds) => {
        let nodesUpdated = false;
        const updatedNodes = nds.map((node) => {
          if (node.id === connection.source && node.type === 'balancerNode') {
            const portIndex = Number(connection.sourceHandle?.split("-out-")[1]);
            if (portIndex === node.data.outputPorts - 1) {
              if (node.data.outputPorts < 7) {
                nodesUpdated = true;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    outputPorts: node.data.outputPorts + 1,
                  },
                };
              }
            }
          }
          if (node.id === connection.target && node.type === 'balancerNode') {
            const portIndex = Number(connection.targetHandle?.split("-in-")[1]);
            if (portIndex === node.data.inputPorts - 1) {
              if (node.data.inputPorts < 7) {
                nodesUpdated = true;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    inputPorts: node.data.inputPorts + 1,
                  },
                };
              }
            }
          }
          return node;
        });

        return nodesUpdated ? updatedNodes : nds;
      });

      // Add the edge and run engine
      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        setTimeout(() => {
          setNodes(currentNodes => {
            setEdges(currentEdges => {
              runEngine(currentNodes, currentEdges);
              return currentEdges;
            });
            return currentNodes;
          });
        }, 0);
        return newEdges;
      });
    },
    [nodes, runEngine, setNodes, setEdges]
  );

  /**
   * EDGE CHANGE HANDLER (for deletions)
   */
  const onEdgesChangeHandler = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      const hasRemoval = changes.some((change: any) => change.type === 'remove');

      if (hasRemoval) {
        console.log("Edges were removed, running engine...");
        setTimeout(() => {
          setEdges((currentEdges) => {
            runEngine(nodes, currentEdges);
            return currentEdges;
          });
        }, 0);
      }
    },
    [nodes, runEngine, onEdgesChange, setEdges]
  );
  /**
   * VALIDATE CONNECTION
   */
  const isValidConnection = useCallback((connection: Connection) => {
    console.log("Validating connection:", connection);
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      console.log("Source or target node not found");
      return false;
    }

    // CRITICAL FIX: Skip validation for Balancer nodes - let the handles handle it
    if (sourceNode.type === 'balancerNode' || targetNode.type === 'balancerNode') {
      console.log("Balancer node involved - delegating validation to handle");
      return true; // Let the handle's isValidConnection handle the validation
    }

    // Regular recipe node validation
    const sIdx = Number(connection.sourceHandle?.split("-out-")[1]);
    const tIdx = Number(connection.targetHandle?.split("-in-")[1]);

    const sMat = sourceNode.data.outputs[sIdx]?.material?.name;
    const tMat = targetNode.data.inputs[tIdx]?.material?.name;

    const isValid = sMat === tMat;
    console.log(`Connection valid: ${isValid}, source material: ${sMat}, target material: ${tMat}`);
    return isValid;
  }, [nodes]);

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <MaterialSelector
        onSelect={(value: string) => setSelectedMaterial(value)}
        onAddBalancer={addBalancerNode}
      />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeHandler}
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
          isValidConnection={isValidConnection}
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
              baseInputs: recipe.inputs.map((i) => ({
                ...i,
                baseRate: i.rate
              })),
              baseOutputs: recipe.outputs.map((o) => ({
                ...o,
                baseRate: o.rate
              })),
              inputs: recipe.inputs.map((i) => ({
                ...i,
                rate: i.rate,
                baseRate: i.rate
              })),
              outputs: recipe.outputs.map((o) => ({
                ...o,
                rate: o.rate,
                baseRate: o.rate
              })),
              machines: 1,
              isUnlocked: false,
              canUnlock: true,
              onDelete: deleteNode,
              onUpdateOutput: onUpdateOutput,
              onToggleLock: onToggleLock,
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