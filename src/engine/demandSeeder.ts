import { Demand } from "./types";

export function seedDemands(
  demands: { nodeId: string; material: string; rate: number }[]
): Demand[] {
  return demands.map((d) => ({
    nodeId: d.nodeId,
    material: d.material,
    rate: d.rate,
  }));
}
