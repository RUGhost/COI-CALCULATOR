import { Handle, Position, NodeProps } from "reactflow";
import { useState, useEffect } from "react";
import "../flow/recipeNode.css";

export default function CustomRecipeNode({ id, data }: NodeProps) {
  const [isUnlocked, setIsUnlocked] = useState(data.isUnlocked || false);

  // Update local state if prop changes
  useEffect(() => {
    setIsUnlocked(data.isUnlocked || false);
  }, [data.isUnlocked]);

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newUnlockedState = !isUnlocked;
    
    // Check if this node can be unlocked (not directly connected to another unlocked node)
    if (newUnlockedState && !data.canUnlock) {
      alert("Cannot unlock: This node is directly connected to another unlocked node");
      return;
    }
    
    setIsUnlocked(newUnlockedState);
    
    if (data.onToggleLock) {
      data.onToggleLock(id, newUnlockedState);
    }
  };

  const handleUpdateOutput = (materialName: string, newRate: number) => {
    // Only allow output changes if node is unlocked
    if (!isUnlocked) return;
    
    // Pass the unlocked state to onUpdateOutput
    // If unlocked: only propagate upstream
    data.onUpdateOutput(id, materialName, newRate, isUnlocked);
  };

  return (
    <div className={`recipe-node ${isUnlocked ? 'unlocked-mode' : 'locked-mode'}`}>
      {/* HEADER with lock toggle */}
      <div className="recipe-header">
        <div className="header-left">
          <button
            className={`lock-toggle ${isUnlocked ? 'unlocked' : 'locked'}`}
            onClick={handleToggleLock}
            title={isUnlocked ? "Unlocked: You can change values (upstream only)" : "Locked: Read-only (normal propagation)"}
          >
            {isUnlocked ? '🔓' : '🔒'}
          </button>
          <span className="machine-name">{data.machineName}</span>
        </div>
      </div>

      {/* CLOSE BUTTON */}
      <div
        className="close-btn"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
      >
        ✕
      </div>

      {/* MACHINE COUNT + IMAGE */}
      <div className="machine-image-wrapper">
        <div className="machine-count">×{data.machines.toFixed(2)}</div>
        <div className="machine-image">
          <img src={data.machineLogo} alt={data.machineName} />
        </div>
      </div>

      <div className="divider" />

      <div className="io-container">
        {/* INPUTS */}
        <div className="io-section">
          <div className="io-title">INPUTS</div>
          <div className="io-list">
            {data.inputs.map((input: any, i: number) => (
              <div key={i} className="io-row">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${id}-in-${i}`}
                  className="io-handle"
                />
                <div className="io-content">
                  <img src={input.material.icon} width={24} height={24} alt={input.material.name} />
                  <div className="rate-box">{input.rate.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="vertical-divider" />

        {/* OUTPUTS */}
        <div className="io-section">
          <div className="io-title">OUTPUTS</div>
          <div className="io-list">
            {data.outputs.map((output: any, i: number) => (
              <div key={i} className="io-row">
                <div className="io-content">
                  <div className="rate-control">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateOutput(
                          output.material.name,
                          Math.max(0, output.rate - 1)
                        );
                      }}
                      disabled={!isUnlocked}
                      className={!isUnlocked ? 'disabled-button' : ''}
                    >
                      -
                    </button>
                    
                    <input
                      type="number"
                      value={output.rate.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          handleUpdateOutput(output.material.name, val);
                        }
                      }}
                      readOnly={!isUnlocked}
                      className={isUnlocked ? 'unlocked-input' : 'locked-input'}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateOutput(output.material.name, output.rate + 1);
                      }}
                      disabled={!isUnlocked}
                      className={!isUnlocked ? 'disabled-button' : ''}
                    >
                      +
                    </button>
                  </div>
                  <img src={output.material.icon} width={24} height={24} alt={output.material.name} />
                </div>

                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${id}-out-${i}`}
                  className="io-handle"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mode indicator */}
      {isUnlocked ? (
        <div className="unlock-indicator" title="Manual mode: You can change values (upstream only)">
          🔓 Manual mode (upstream only)
        </div>
      ) : (
        <div className="lock-indicator" title="Locked mode: Read-only (normal propagation)">
          🔒 Locked mode (read-only)
        </div>
      )}
    </div>
  );
}