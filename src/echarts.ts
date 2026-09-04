import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart, GraphChart, LineChart, SankeyChart, ScatterChart, TreeChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from "echarts/components";

use([
  CanvasRenderer,
  BarChart,
  GraphChart,
  LineChart,
  SankeyChart,
  ScatterChart,
  TreeChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
]);
