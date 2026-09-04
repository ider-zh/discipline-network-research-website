<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson, round } from "../data";

type Row = [number, number, number, number?];
type NetworkData = Record<string, Row[]>;
type Metric = "distance" | "clustering" | "connected" | "articles" | "ratio";
type Source = "quarter" | "academic-lv2" | "academic-lv3";
const data = ref<NetworkData>({});
const selected = ref(["Biology", "Computer science", "Mathematics"]);
const metric = ref<Metric>("distance");
const source = ref<Source>("quarter");
const error = ref("");
const labels: Record<Metric, string> = { distance: "average distance", clustering: "clustering coefficient", connected: "connected articles", articles: "articles", ratio: "connected / articles" };

const sources: Record<Source, { file: string; label: string; clustering: boolean }> = {
  quarter: { file: "wikipedia-network-quarter.json", label: "二级学科网络", clustering: true },
  "academic-lv2": { file: "wikipedia-network-academic-lv2.json", label: "二级学科学术圈", clustering: false },
  "academic-lv3": { file: "wikipedia-network-academic-lv3.json", label: "三级学科学术圈", clustering: false },
};

async function loadSource() {
  error.value = "";
  data.value = {};
  try {
    data.value = await loadJson<NetworkData>(`/data/${sources[source.value].file}`);
    if (!sources[source.value].clustering && metric.value === "clustering") metric.value = "distance";
    selected.value = selected.value.filter((name) => name in data.value);
    if (!selected.value.length) selected.value = Object.keys(data.value).filter((name) => name !== "xueshu").slice(0, 3);
  }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
}

onMounted(loadSource);

const subjects = computed(() => Object.keys(data.value).sort());
const quarters = computed(() => Array.from({ length: Math.max(0, ...Object.values(data.value).map((rows) => rows.length)) }, (_, index) => `${2007 + Math.floor(index / 4)}Q${index % 4 + 1}`));
const option = computed<EChartsCoreOption | undefined>(() => subjects.value.length ? lineChartOption(
  quarters.value,
  selected.value.map((name) => ({ name, data: (data.value[name] ?? []).map((row) => {
    const offset = sources[source.value].clustering ? 0 : -1;
    const connected = row[2 + offset] ?? null;
    const articles = row[3 + offset] ?? null;
    if (metric.value === "ratio") return connected !== null && articles ? round(connected / articles, 4) : null;
    if (metric.value === "distance") return round(row[0], 4);
    if (metric.value === "clustering") return sources[source.value].clustering ? round(row[1], 4) : null;
    return metric.value === "connected" ? connected : articles;
  }) })),
  labels[metric.value],
  "quarter",
) : undefined);
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Wikipedia · Small World" title="Network Profile" description="比较各学科学术圈的平均最短距离、聚类系数和联通规模。" />
    <ChartPanel :option="option" :loading="!subjects.length && !error" :error="error" source="wikipediaNetwork_Quarter.json · upstream static snapshot">
      <template #controls>
        <label class="control"><span>数据网络</span><select v-model="source" @change="loadSource"><option v-for="(config, key) in sources" :key="key" :value="key">{{ config.label }}</option></select></label>
        <label class="control"><span>指标</span><select v-model="metric"><option value="distance">平均最短距离</option><option value="clustering" :disabled="!sources[source].clustering">聚类系数</option><option value="connected">联通文章数</option><option value="articles">文章数</option><option value="ratio">联通比例</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
