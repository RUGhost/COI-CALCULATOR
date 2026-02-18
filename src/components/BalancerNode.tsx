import { Handle, Position, NodeProps } from "reactflow";
import { useState, useEffect, useCallback } from "react";
import "../flow/balancerNode.css";

export default function BalancerNode({ id, data }: NodeProps) {
  const [inputPorts, setInputPorts] = useState(data.inputPorts || 1);
  const [outputPorts, setOutputPorts] = useState(data.outputPorts || 1);
  const [material, setMaterial] = useState(data.material || null);
  const [connectedInputs, setConnectedInputs] = useState<boolean[]>(
    data.connectedInputs || new Array(data.inputPorts || 1).fill(false)
  );
  const [connectedOutputs, setConnectedOutputs] = useState<boolean[]>(
    data.connectedOutputs || new Array(data.outputPorts || 1).fill(false)
  );

  // Update when data changes
  useEffect(() => {
    setInputPorts(data.inputPorts || 1);
    setOutputPorts(data.outputPorts || 1);
    setMaterial(data.material || null);
    setConnectedInputs(data.connectedInputs || new Array(data.inputPorts || 1).fill(false));
    setConnectedOutputs(data.connectedOutputs || new Array(data.outputPorts || 1).fill(false));
  }, [data]);

  // Get material icon
  const getMaterialIcon = () => {
    if (!material) return null;
    return material.icon || `https://via.placeholder.com/24?text=${material.name.charAt(0)}`;
  };

  // CRITICAL FIX: Proper validation for input ports with material checking
  const isValidInputConnection = useCallback((connection: any) => {
    console.log("🔍 Balancer input validation:", {
      connection,
      currentMaterial: material,
      portIndex: connection.targetHandle?.split('-in-')[1],
      connectedInputs
    });

    // FIX: Use data.nodes.find instead of data.getNode
    const sourceNode = data.nodes?.find((n: any) => n.id === connection.source);
    if (!sourceNode) {
      console.log("❌ Source node not found");
      return false;
    }

    // Get the port index from the handle ID
    const portIndex = Number(connection.targetHandle?.split('-in-')[1]);

    // Check 1: Is this port already connected?
    if (connectedInputs[portIndex]) {
      console.log(`❌ Input port ${portIndex} already connected`);
      return false;
    }

    // Get source material
    let sourceMaterial = null;
    if (sourceNode.type === 'balancerNode') {
      sourceMaterial = sourceNode.data.material?.name;
      console.log(`Source is balancer with material: ${sourceMaterial}`);
    } else {
      const sourceOutput = sourceNode.data.outputs?.[Number(connection.sourceHandle?.split('-out-')[1])];
      sourceMaterial = sourceOutput?.material?.name;
      console.log(`Source is recipe node with material: ${sourceMaterial}`);
    }

    // Check 2: If balancer already has material, source MUST match
    if (material) {
      console.log(`Comparing - Balancer material: ${material.name}, Source material: ${sourceMaterial}`);
      if (sourceMaterial !== material.name) {
        console.log(`❌ Material mismatch: balancer has ${material.name}, source has ${sourceMaterial}`);
        return false;
      }
    }

    console.log(`✅ Input port ${portIndex} connection valid`);
    return true;
  }, [material, connectedInputs, data.nodes]);

  // CRITICAL FIX: Proper validation for output ports with material checking
  const isValidOutputConnection = useCallback((connection: any) => {
    console.log("🔍 Balancer output validation:", {
      connection,
      currentMaterial: material,
      portIndex: connection.sourceHandle?.split('-out-')[1],
      connectedOutputs
    });

    // FIX: Use data.nodes.find instead of data.getNode
    const targetNode = data.nodes?.find((n: any) => n.id === connection.target);
    if (!targetNode) {
      console.log("❌ Target node not found");
      return false;
    }

    // Get the port index from the handle ID
    const portIndex = Number(connection.sourceHandle?.split('-out-')[1]);

    // Check 1: Is this port already connected?
    if (connectedOutputs[portIndex]) {
      console.log(`❌ Output port ${portIndex} already connected`);
      return false;
    }

    // Get target material
    let targetMaterial = null;
    if (targetNode.type === 'balancerNode') {
      targetMaterial = targetNode.data.material?.name;
      console.log(`Target is balancer with material: ${targetMaterial}`);
    } else {
      const targetInput = targetNode.data.inputs?.[Number(connection.targetHandle?.split('-in-')[1])];
      targetMaterial = targetInput?.material?.name;
      console.log(`Target is recipe node with material: ${targetMaterial}`);
    }

    // Check 2: If balancer already has material, target MUST match
    if (material) {
      console.log(`Comparing - Balancer material: ${material.name}, Target material: ${targetMaterial}`);
      if (targetMaterial !== material.name) {
        console.log(`❌ Material mismatch: balancer has ${material.name}, target has ${targetMaterial}`);
        return false;
      }
    }

    console.log(`✅ Output port ${portIndex} connection valid`);
    return true;
  }, [material, connectedOutputs, data.nodes]);

  return (
    <div className="balancer-node">
      <div className="balancer-header">
        <span>⚖️ Balancer</span>
        <button
          className="close-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (data.onDelete) data.onDelete(id);
          }}
        >
          ✕
        </button>
      </div>

      <div className="balancer-content">
        {/* Material display */}
        <div className="material-display">
          {material ? (
            <>
              <img src={getMaterialIcon()} alt={material.name} width={32} height={32} />
              <span className="material-name">{material.name}</span>
            </>
          ) : (
            <span className="material-pending">Connect to set material</span>
          )}
        </div>

        {/* Port counts */}
        <div className="port-stats">
          <div>IN: {inputPorts}</div>
          <div>OUT: {outputPorts}</div>
        </div>
      </div>

      {/* Input Ports - Left Side */}
      <div className="ports-left">
        {Array.from({ length: inputPorts }).map((_, index) => {
          const isConnected = connectedInputs[index];
          const portId = `${id}-in-${index}`;

          return (
            <div key={portId} className="port-row" style={{ top: `${index * 35}px` }}>
              <Handle
                type="target"
                position={Position.Left}
                id={portId}
                className={`balancer-handle input-handle ${material ? 'material-set' : ''} ${isConnected ? 'connected' : ''}`}
                isValidConnection={isValidInputConnection}
                // In the onConnect handlers in BalancerNode.tsx:

                // In the onConnect handler for input ports:
                onConnect={(connection) => {
                  console.log(`🔌 Input port ${index} connected`, connection);

                  // Mark this port as connected in local state
                  const newConnectedInputs = [...connectedInputs];
                  newConnectedInputs[index] = true;
                  setConnectedInputs(newConnectedInputs);

                  // CRITICAL: Call the parent's onPortConnected to update App state
                  if (data.onPortConnected) {
                    console.log(`📞 Calling onPortConnected for input ${index}`);
                    data.onPortConnected(id, 'input', index, true);
                  } else {
                    console.error("❌ onPortConnected not provided to balancer!");
                  }

                  // If this is the first connection and material not set, determine material
                  if (!material) {
                    const sourceNode = data.nodes?.find((n: any) => n.id === connection.source);
                    if (sourceNode && sourceNode.type !== 'balancerNode') {
                      const sourceOutput = sourceNode.data.outputs?.[Number(connection.sourceHandle?.split('-out-')[1])];
                      if (sourceOutput) {
                        console.log(`🎯 Setting balancer material to: ${sourceOutput.material.name}`);
                        data.onMaterialDetermined?.(id, sourceOutput.material);
                      }
                    } else if (sourceNode && sourceNode.type === 'balancerNode') {
                      data.onMaterialDetermined?.(id, sourceNode.data.material);
                    }
                  }
                }}
              />
              <span className="port-label">IN-{index + 1}</span>
              {isConnected && <span className="port-status">●</span>}
            </div>
          );
        })}
      </div>

      {/* Output Ports - Right Side */}
      <div className="ports-right">
        {Array.from({ length: outputPorts }).map((_, index) => {
          const isConnected = connectedOutputs[index];
          const portId = `${id}-out-${index}`;

          return (
            <div key={portId} className="port-row right" style={{ top: `${index * 35}px` }}>
              <Handle
                type="source"
                position={Position.Right}
                id={portId}
                className={`balancer-handle output-handle ${material ? 'material-set' : ''} ${isConnected ? 'connected' : ''}`}
                isValidConnection={isValidOutputConnection}
                onConnect={(connection) => {
                  console.log(`🔌 Output port ${index} connected`);

                  // Mark this port as connected
                  const newConnectedOutputs = [...connectedOutputs];
                  newConnectedOutputs[index] = true;
                  setConnectedOutputs(newConnectedOutputs);

                  // If this is the first connection and material not set, determine material
                  if (!material) {
                    const targetNode = data.getNode?.(connection.target);
                    if (targetNode && targetNode.type !== 'balancerNode') {
                      const targetInput = targetNode.data.inputs?.[Number(connection.targetHandle?.split('-in-')[1])];
                      if (targetInput) {
                        console.log(`🎯 Setting balancer material to: ${targetInput.material.name}`);
                        data.onMaterialDetermined?.(id, targetInput.material);
                      }
                    } else if (targetNode && targetNode.type === 'balancerNode') {
                      data.onMaterialDetermined?.(id, targetNode.data.material);
                    }
                  }

                  // Notify parent about connection
                  data.onPortConnected?.(id, 'output', index, true);
                }}
              />
              <span className="port-label">OUT-{index + 1}</span>
              {isConnected && <span className="port-status">●</span>}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="balancer-footer">
        {material ? (
          <small>🔒 Locked to {material.name} • One edge per port</small>
        ) : (
          <small>⚡ Connect first edge to set material</small>
        )}
      </div>
    </div>
  );
}