export function scaleRecipe(
  nodeData: any,
  outputName: string,
  newValue: number
) {
  // find base output
  const baseOut = nodeData.baseOutputs.find(
    (o: any) => o.material.name === outputName
  );
  if (!baseOut) return null;

  const scaleFactor = newValue / baseOut.baseRate;

  const scaleList = (arr: any[]) =>
    arr.map((item) => ({
      ...item,
      rate: Math.round(item.baseRate * scaleFactor * 100) / 100,
    }));

  return {
    machines: Math.round(scaleFactor * 100) / 100,
    inputs: scaleList(nodeData.baseInputs),
    outputs: scaleList(nodeData.baseOutputs),
  };
}
