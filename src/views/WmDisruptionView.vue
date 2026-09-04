<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson } from "../data";

type Cell = string | number | null;
type Table = Cell[][];

const mode = ref<"disruption" | "papers">("papers");
const selected = ref(["WM", "Chemistry", "Mathematics", "Biology"]);
const tables = ref<Record<string, Table>>({});
const error = ref("");

onMounted(async () => {
  try {
    const [disruption, papers] = await Promise.all([
      loadJson<Table>("/data/wm/disruption.json"),
      loadJson<Table>("/data/wm/connected-papers.json"),
    ]);
    tables.value = { disruption, papers };
  } catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const subjects = computed(() => (tables.value[mode.value]?.[0] ?? []).slice(1).map(String));
const option = computed<EChartsCoreOption | undefined>(() => {
  const table = tables.value[mode.value];
  if (!table) return undefined;
  return {
    color: ["#00a896", "#396afc", "#f05d23", "#8a4fff", "#dc3f63", "#d6a21d"],
    tooltip: { trigger: "axis" },
    legend: { top: 10, type: "scroll" },
    toolbox: { right: 12, feature: { saveAsImage: {}, restore: {} } },
    grid: { top: 70, right: 30, bottom: 48, left: 72 },
    dataset: { source: table },
    xAxis: { type: "category", name: "year", boundaryGap: false },
    yAxis: { type: "value", name: mode.value === "papers" ? "papers" : "disruption", scale: true, splitLine: { lineStyle: { color: "#e8e9ed" } } },
    series: selected.value.map((name) => ({ type: "line", name, encode: { x: "year", y: name }, showSymbol: false, smooth: 0.12, lineStyle: { width: 2.4 } })),
  };
});
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Web of Science · Evolution" title="Disruption by Discipline" description="比较不同学科逐年的平均颠覆度，或切换到进入联通网络的论文数量。" />
    <ChartPanel :option="option" :loading="!Object.keys(tables).length && !error" :error="error" source="WM annual disruption and connected-paper aggregates">
      <template #controls>
        <label class="control"><span>图表</span><select v-model="mode"><option value="papers">联通 Paper 数</option><option value="disruption">平均颠覆度</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
