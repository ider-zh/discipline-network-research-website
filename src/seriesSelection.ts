export type SelectableChartType = "line" | "bar" | "scatter" | "bubble" | "graph";

export function availableSeries(series: Record<string, unknown>): string[] {
  return Object.keys(series).sort();
}

export function canSelectSeries(chartType: SelectableChartType, available: string[]): boolean {
  return chartType !== "bar" && available.length > 1;
}

export function reconcileSeriesSelection(selected: string[], available: string[], preferred: string[], limit = 4): string[] {
  const availableSet = new Set(available);
  const retained = selected.filter((name) => availableSet.has(name));
  if (retained.length) return retained;

  const defaults = preferred.filter((name) => availableSet.has(name));
  return (defaults.length ? defaults : available).slice(0, limit);
}
