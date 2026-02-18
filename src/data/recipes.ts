import { Recipe } from "../types/recipe";

export const recipes: Recipe[] = [
  {
    id: 1,
    machineName: "Assembly I",
    machineLogo: "/icons/AssemblyManual.png",
    inputs: [
      { material: { name: "Rubber", icon: "/icons/Rubber.png" }, rate: 1 },
      { material: { name: "Copper", icon: "/icons/Copper.png" }, rate: 4 }
    ],
    outputs: [
      { material: { name: "Electronics1", icon: "/icons/Electronics1.png" }, rate: 4 }
    ]
  },
  {
    id: 2,
    machineName: "Rubber Maker",
    machineLogo: "/icons/Rubber_Maker.png",
    inputs: [
      { material: { name: "Diesel", icon: "/icons/Diesel.png" }, rate: 8 },
      { material: { name: "Coal", icon: "/icons/Coal.png" }, rate: 2 }
    ],
    outputs: [
      { material: { name: "Rubber", icon: "/icons/Rubber.png" }, rate: 16 },
      { material: { name: "WasteWater", icon: "/icons/WasteWater.png" }, rate: 4 }
    ]
  },
  {
    id: 3,
    machineName: "Basic Distiller",
    machineLogo: "/icons/Basic_Distiller.png",
    inputs: [
      { material: { name: "CrudeOil", icon: "/icons/CrudeOil.png" }, rate: 60 },
      { material: { name: "Coal", icon: "/icons/Coal.png" }, rate: 6 }
    ],
    outputs: [
      { material: { name: "Diesel", icon: "/icons/Diesel.png" }, rate: 27 },
      { material: { name: "WasteWater", icon: "/icons/WasteWater.png" }, rate: 15 },
      { material: { name: "Exhaust", icon: "/icons/Exhaust.png" }, rate: 36 }
    ]
  },
  {
    id: 4,
    machineName: "Copper Electrolysis",
    machineLogo: "/icons/Copper_Electrolysis.png",
    inputs: [
      { material: { name: "CopperImpure", icon: "/icons/CopperImpure.png" }, rate: 24 },
      { material: { name: "Acid", icon: "/icons/Acid.png" }, rate: 6 }
    ],
    outputs: [
      { material: { name: "Copper", icon: "/icons/Copper.png" }, rate: 24 }
    ]
  },
  {
    id: 5,
    machineName: "Assembly III",
    machineLogo: "/icons/AssemblyElectrifiedT2.png",
    inputs: [
      { material: { name: "Glass", icon: "/icons/Glass.png" }, rate: 6 },
      { material: { name: "Plastic", icon: "/icons/Plastic.png" }, rate: 6 },
      { material: { name: "Copper", icon: "/icons/Copper.png" }, rate: 3 }
    ],
    outputs: [
      { material: { name: "PCB", icon: "/icons/PCB.png" }, rate: 12 }
    ]
  },
];
