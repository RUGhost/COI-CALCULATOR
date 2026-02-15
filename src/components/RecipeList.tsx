import { recipes } from "../data/recipes";
import { Recipe } from "../types/recipe";

type Props = {
  materialName: string | null;
  onRecipeClick: (recipe: Recipe) => void;
};

export default function RecipeList({ materialName, onRecipeClick }: Props) {
  if (!materialName) return <div style={{ padding: 16 }}>Select a material</div>;

  const filtered = recipes.filter(r =>
    [...r.inputs, ...r.outputs].some(io => io.material.name === materialName)
  );

  return (
    <div style={{ width: 300, borderLeft: "1px solid #ccc" }}>
      {filtered.map(r => (
        <div
          key={r.id}
          onClick={() => onRecipeClick(r)}
          style={{ padding: 12, cursor: "pointer" }}
        >
          {r.machineName}
        </div>
      ))}
    </div>
  );
}
