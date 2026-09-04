<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, ref, watch } from "vue";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson, round, subjectFileName } from "../data";

type EntropyFile = Record<string, unknown[]>;
type Metric = "degree" | "structure" | "normalized" | "nodes";
type Direction = "In" | "Out" | "Undirected";

const subjects = ["Mathematics", "Materials science", "Physics", "Chemistry", "Biology", "Medicine", "Computer science", "Engineering", "Economics", "Psychology", "Sociology", "History", "Geology", "Geography", "Environmental science", "Artificial intelligence", "Neuroscience", "Philosophy", "Political science", "Linguistics", "Literature"];
const selected = ref(["Mathematics", "Materials science"]);
const metric = ref<Metric>("nodes");
const direction = ref<Direction>("In");
const loading = ref(false);
const error = ref("");
const seriesData = ref<Record<string, Array<number | null>>>({});
let updateId = 0;

const metricConfig = computed(() => {
  if (metric.value === "degree") return { folder: "degreeEntropy", key: `${direction.value}E`, label: "度分布熵" };
  if (metric.value === "structure") return { folder: "structEntropy", key: `${direction.value}E`, label: "结构熵" };
  if (metric.value === "normalized") return { folder: "structEntropy", key: `${direction.value}SE`, label: "标准结构熵" };
  return { folder: "structEntropy", key: `${direction.value}Length`, label: "网络节点数" };
});

async function update() {
  const currentUpdateId = ++updateId;
  const selectedSnapshot = [...selected.value];
  const configSnapshot = { ...metricConfig.value };
  loading.value = true; error.value = "";
  try {
    const entries = await Promise.all(selectedSnapshot.map(async (subject) => {
      const data = await loadJson<EntropyFile>(`/data/openalex-entropy/${configSnapshot.folder}/${subjectFileName(subject)}`);
      return [subject, (data[configSnapshot.key] ?? []).map((value) => round(value))] as const;
    }));
    if (currentUpdateId === updateId) seriesData.value = Object.fromEntries(entries);
  } catch (reason) {
    if (currentUpdateId === updateId) error.value = reason instanceof Error ? reason.message : "数据加载失败";
  }
  finally { if (currentUpdateId === updateId) loading.value = false; }
}

watch([selected, metric, direction], update, { deep: true, immediate: true });

const option = computed<EChartsCoreOption>(() => ({
  color: ["#8a4fff", "#f05d23", "#396afc", "#00a896", "#dc3f63"],
  tooltip: { trigger: "axis" },
  legend: { top: 8, type: "scroll" },
  toolbox: { right: 12, feature: { saveAsImage: {}, dataZoom: { yAxisIndex: "none" }, restore: {} } },
  grid: { top: 68, right: 28, bottom: 66, left: 74 },
  xAxis: { type: "category", name: "year", data: Array.from({ length: 123 }, (_, index) => 1900 + index), boundaryGap: false },
  yAxis: { type: "value", name: metricConfig.value.label, scale: true, splitLine: { lineStyle: { color: "#e8e9ed" } } },
  dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 18, start: 40 }],
  series: Object.entries(seriesData.value).map(([name, data]) => ({ name, type: "line", data, showSymbol: false, connectNulls: true, lineStyle: { width: 2.3 } })),
}));
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="OpenAlex · Complexity" title="Network Entropy" description="按学科、网络方向和熵指标探索 OpenAlex 学术网络的长期结构变化。" />
    <ChartPanel :option="option" :loading="loading" :error="error" source="OpenAlex entropy snapshots, 1900–2022">
      <template #controls>
        <label class="control"><span>指标</span><select v-model="metric"><option value="degree">度分布熵</option><option value="structure">结构熵</option><option value="normalized">标准结构熵</option><option value="nodes">网络节点数</option></select></label>
        <label class="control"><span>方向</span><select v-model="direction"><option value="In">入度</option><option value="Out">出度</option><option value="Undirected">无向</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
