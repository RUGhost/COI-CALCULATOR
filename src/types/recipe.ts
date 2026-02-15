export type Material = {
  name: string;
  icon: string;
};

export type IOItem = {
  material: Material;
  rate: number;
};

export type Recipe = {
  id: number;
  machineName: string;
  machineLogo: string;
  inputs: IOItem[];
  outputs: IOItem[];
};
