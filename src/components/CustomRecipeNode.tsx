import { Handle, Position, NodeProps } from "reactflow";
import "../flow/recipeNode.css";

export default function CustomRecipeNode({ id, data }: NodeProps) {
  return (
    <div className="recipe-node">
      {/* HEADER */}
      <div className="recipe-header">
        {data.machineName}
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

      {/* MACHINE IMAGE */}
      <div className="machine-image">
        <img src={data.machineLogo} />
      </div>

      <div className="divider" />

      {/* INPUTS / OUTPUTS */}
      <div className="io-container">
        {/* INPUTS */}
        <div className="io-section">
          <div className="io-title">INPUTS</div>
          <div className="io-list">
            {data.inputs.map((input: any, i: number) => (
              <div key={i} className="io-row">
                {/* Handle positioned at the start of the row */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${id}-in-${i}`}
                  className="io-handle"
                  style={{
                    position: "absolute",
                    left: -8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <div className="io-content">
                  <img src={input.material.icon} width={28} height={28} />
                  <div className="rate-box">{input.rate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER LINE */}
        <div className="vertical-divider" />

        {/* OUTPUTS */}
        <div className="io-section">
          <div className="io-title">OUTPUTS</div>
          <div className="io-list">
            {data.outputs.map((output: any, i: number) => (
              <div key={i} className="io-row">
                <div className="io-content">
                  <div className="rate-box">{output.rate}</div>
                  <img src={output.material.icon} width={28} height={28} />
                </div>
                
                {/* Handle positioned at the end of the row */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${id}-out-${i}`}
                  className="io-handle"
                  style={{
                    position: "absolute",
                    right: -8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}