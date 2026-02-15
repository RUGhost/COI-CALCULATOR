export type MaterialName = string;

export type EngineNode = {
  id: string;
  data: any; // recipe node data
};

export type EngineEdge = {
  source: string;
  target: string;
  material: MaterialName;
};

export type Demand = {
  nodeId: string;
  material: MaterialName;
  rate: number;
};

export type Graph = {
  nodes: EngineNode[];
  edges: EngineEdge[];
};
