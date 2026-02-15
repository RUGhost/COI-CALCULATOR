import { useState } from "react";
import { materials } from "../data/materials";

type Props = {
  onSelect: (materialName: string) => void;
};

export default function MaterialSelector({ onSelect }: Props) {
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

      <div style={{ overflowY: "auto", maxHeight: "80vh" }}>
        {filtered.map(m => (
          <div
            key={m.name}
            onClick={() => onSelect(m.name)}
            style={{ display: "flex", gap: 8, padding: 8, cursor: "pointer" }}
          >
            <img src={m.icon} width={24} />
            {m.name}
          </div>
        ))}
      </div>
    </div>
  );
}
