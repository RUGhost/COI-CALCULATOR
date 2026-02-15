import { Handle, Position, NodeProps } from "reactflow";
import "../flow/recipeNode.css";

export default function CustomRecipeNode({ id, data }: NodeProps) {
  return (
    <div className="recipe-node">
      {/* HEADER */}
      <div className="recipe-header">{data.machineName}</div>

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
        <div className="machine-count">×{data.machines}</div>
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
                  <div className="rate-box">{input.rate}</div>
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
                        data.onUpdateOutput(
                          id, // Make sure 'id' is available from props
                          output.material.name,
                          Math.max(0, output.rate - 1)
                        );
                      }}
                    >
                      -
                    </button>
                    
                    <input
                      type="number"
                      value={output.rate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          data.onUpdateOutput(id, output.material.name, val);
                        }
                      }}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onUpdateOutput(id, output.material.name, output.rate + 1);
                      }}
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
    </div>
  );
}