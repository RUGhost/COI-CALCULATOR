import { useState } from "react";
import { materials } from "../data/materials";

type Props = {
  onSelect: (materialName: string) => void;
  onAddBalancer: () => void;  // Add this prop
};

export default function MaterialSelector({ onSelect, onAddBalancer }: Props) {
  const [search, setSearch] = useState("");

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: 250, borderRight: "1px solid #ccc" }}>
      <input
        placeholder="Search material"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      
      {/* Add Balancer button */}
      <button 
        onClick={onAddBalancer}
        style={{
          width: '100%',
          padding: 10,
          margin: '10px 0',
          background: '#ffaa00',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <span>⚖️</span> Add Balancer
      </button>

      <div style={{ overflowY: "auto", maxHeight: "calc(80vh - 120px)" }}>
        {filtered.map(m => (
          <div
            key={m.name}
            onClick={() => onSelect(m.name)}
            style={{ 
              display: "flex", 
              gap: 8, 
              padding: 8, 
              cursor: "pointer",
              alignItems: "center",
              borderBottom: "1px solid #eee"
            }}
          >
            <img src={m.icon} width={24} height={24} alt={m.name} />
            {m.name}
          </div>
        ))}
      </div>
    </div>
  );
}