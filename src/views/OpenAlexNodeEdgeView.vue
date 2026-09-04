<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import { loadJson } from "../data";

type Stat = { x: string[]; y: number[]; title: string };
type Stats = Record<string, Stat>;

const type = ref("node");
const data = ref<Stats>();
const error = ref("");
const labels: Record<string, string> = {
  node: "全部节点", edge: "全部边", fos: "学科数",
  node_dx: "联通网络节点", edge_dx: "联通网络边", fos_dx: "联通网络学科",
};

onMounted(async () => {
  try { data.value = await loadJson<Stats>("/data/openalex-node-edge.json"); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const option = computed<EChartsCoreOption | undefined>(() => {
  const selected = data.value?.[type.value];
  if (!selected) return undefined;
  return {
    color: ["#396afc"],
    title: { text: selected.title || labels[type.value], left: 12, textStyle: { fontSize: 16, fontWeight: 600 } },
    tooltip: { trigger: "axis", valueFormatter: (value: unknown) => Number(value).toLocaleString() },
    toolbox: { right: 12, feature: { saveAsImage: {}, dataZoom: { yAxisIndex: "none" }, restore: {} } },
    grid: { top: 72, right: 32, bottom: 70, left: 76 },
    xAxis: { type: "category", name: "year", data: selected.x, boundaryGap: false },
    yAxis: { type: "value", min: "dataMin", splitLine: { lineStyle: { color: "#e8e9ed" } } },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 20 }],
    series: [{ name: labels[type.value], type: "line", data: selected.y, showSymbol: false, smooth: 0.18, lineStyle: { width: 3 }, areaStyle: { opacity: 0.08 } }],
  };
});
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="OpenAlex · Growth" title="Node & Edge Statistics" description="观察 OpenAlex 网络从 1900 年以来的节点、边与学科数量增长，并区分全部记录和联通网络。" />
    <ChartPanel :option="option" :loading="!data && !error" :error="error" source="openAlex_nobook_notypenull annual aggregates">
      <template #controls>
        <label class="control"><span>指标</span><select v-model="type"><option v-for="(label, value) in labels" :key="value" :value="value">{{ label }}</option></select></label>
        <span class="control-note">拖动底部缩放条查看局部年份</span>
      </template>
    </ChartPanel>
  </div>
</template>
