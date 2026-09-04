import type { EChartsCoreOption } from "echarts/core";

export type LineSeries = { name: string; data: Array<number | null> };

export function lineChartOption(
  x: Array<string | number>,
  series: LineSeries[],
  yName: string,
  xName = "time",
): EChartsCoreOption {
  return {
    color: ["#f05d23", "#396afc", "#8a4fff", "#00a896", "#dc3f63", "#d6a21d", "#4472a8"],
    tooltip: { trigger: "axis" },
    legend: { top: 8, type: "scroll" },
    toolbox: { right: 12, feature: { saveAsImage: {}, dataZoom: { yAxisIndex: "none" }, restore: {} } },
    grid: { top: 68, right: 32, bottom: 68, left: 80 },
    xAxis: { type: "category", name: xName, data: x, boundaryGap: false },
    yAxis: { type: "value", name: yName, scale: true, splitLine: { lineStyle: { color: "#e8e9ed" } } },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 18 }],
    series: series.map((item) => ({
      ...item,
      type: "line",
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2.2 },
    })),
  };
}
