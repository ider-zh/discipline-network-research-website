<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson } from "../data";
import { availableSeries, canSelectSeries, reconcileSeriesSelection } from "../seriesSelection";

type Dimension = { key: string; label: string; default: string; options: Array<{ value: string; label: string }> };
type DataPoint = number | null | [number | null, number | null] | [number | null, number | null, number];
type GraphLink = { source: string; target: string; value: number };
type Variant = { title: string; x: Array<string | number>; chartType: "line" | "bar" | "scatter" | "bubble" | "graph"; series: Record<string, DataPoint[]>; links?: GraphLink[] };
type Bundle = { eyebrow: string; title: string; description: string; source: string; dimensions: Dimension[]; defaults: string[]; variants: Record<string, Variant> };

const route = useRoute();
const bundle = ref<Bundle>();
const selections = ref<Record<string, string>>({});
const selectedSubjects = ref<string[]>([]);
const error = ref("");

watch(() => route.params.slug, async (slug) => {
  bundle.value = undefined; error.value = "";
  try {
    const loaded = await loadJson<Bundle>(`/data/snapshots/${slug}.json`);
    bundle.value = loaded;
    selections.value = Object.fromEntries(loaded.dimensions.map((item) => [item.key, item.default]));
    const initialKey = loaded.dimensions.map((item) => item.default).join("|");
    const available = Object.keys(loaded.variants[initialKey]?.series ?? {});
    const preferred = loaded.defaults.filter((name) => available.includes(name));
    selectedSubjects.value = preferred.length ? preferred : available.slice(0, 4);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
}, { immediate: true });

const variantKey = computed(() => bundle.value?.dimensions.map((item) => selections.value[item.key]).join("|") ?? "");
const current = computed(() => bundle.value?.variants[variantKey.value]);
const subjects = computed(() => availableSeries(current.value?.series ?? {}));
const showSeriesSelector = computed(() => current.value ? canSelectSeries(current.value.chartType, subjects.value) : false);

watch(current, (variant) => {
  if (!variant || variant.chartType === "bar") return;
  selectedSubjects.value = reconcileSeriesSelection(selectedSubjects.value, availableSeries(variant.series), bundle.value?.defaults ?? []);
});

const option = computed<EChartsCoreOption | undefined>(() => {
  if (!current.value) return undefined;
  if (current.value.chartType === "bar") {
    const data = Object.values(current.value.series)[0] ?? [];
    return {
      color: ["#f05d23"], tooltip: { trigger: "axis" }, toolbox: { right: 12, feature: { saveAsImage: {}, restore: {} } },
      grid: { top: 46, right: 30, bottom: 84, left: 78 },
      xAxis: { type: "category", data: current.value.x, axisLabel: { rotate: 35 } },
      yAxis: { type: "value", scale: true, splitLine: { lineStyle: { color: "#e8e9ed" } } },
      series: [{ type: "bar", name: current.value.title, data, barMaxWidth: 34 }],
    };
  }
  if (current.value.chartType === "scatter") {
    const visible = selectedSubjects.value.filter((name) => current.value?.series[name]);
    return {
      color: ["#f05d23", "#396afc", "#8a4fff", "#00a896", "#dc3f63", "#d6a21d"],
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } }, legend: { top: 8, type: "scroll" },
      toolbox: { right: 12, feature: { saveAsImage: {}, dataZoom: {}, restore: {} } },
      grid: { top: 68, right: 32, bottom: 68, left: 80 }, xAxis: { type: "value", name: "log degree", scale: true }, yAxis: { type: "value", name: "log frequency", scale: true },
      dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 18 }],
      series: visible.map((name) => ({ name, type: "scatter", symbolSize: 4, large: true, data: current.value?.series[name] ?? [] })),
    };
  }
  if (current.value.chartType === "bubble") {
    const visible = selectedSubjects.value.filter((name) => current.value?.series[name]);
    if (!visible.length) return undefined;
    const sizes = visible.map((name) => Number((current.value?.series[name]?.[0] as [number, number, number])?.[2] ?? 0));
    const min = Math.cbrt(Math.min(...sizes));
    const span = Math.max(1, Math.cbrt(Math.max(...sizes)) - min);
    return {
      color: ["#f05d23", "#396afc", "#8a4fff", "#00a896", "#dc3f63", "#d6a21d", "#4472a8"],
      tooltip: { trigger: "item" }, legend: { top: 8, type: "scroll" }, toolbox: { right: 12, feature: { saveAsImage: {}, restore: {} } },
      grid: { top: 68, right: 32, bottom: 56, left: 80 }, xAxis: { type: "value", name: "distance from Biology", scale: true }, yAxis: { type: "value", name: "distance from Physics", scale: true },
      series: visible.map((name) => ({ name, type: "scatter", data: current.value?.series[name] ?? [], symbolSize: (point: number[]) => 14 + 46 * (Math.cbrt(point[2]) - min) / span, label: { show: true, formatter: name, position: "top" } })),
    };
  }
  if (current.value.chartType === "graph") {
    const visible = new Set(selectedSubjects.value);
    const nodes = Object.entries(current.value.series).filter(([name]) => visible.has(name));
    if (!nodes.length) return undefined;
    const weights = nodes.map(([, values]) => Math.cbrt(Number(values[0] ?? 0)));
    const min = Math.min(...weights);
    const span = Math.max(1, Math.max(...weights) - min);
    return {
      animation: false, color: ["#f05d23"], tooltip: { trigger: "item" }, toolbox: { right: 12, feature: { saveAsImage: {}, restore: {} } },
      series: [{ type: "graph", layout: "force", roam: true, draggable: true, force: { repulsion: 360, edgeLength: [75, 210], gravity: 0.08, layoutAnimation: false }, data: nodes.map(([name, values]) => ({ id: name, name, value: values[0], symbolSize: 15 + 38 * (Math.cbrt(Number(values[0] ?? 0)) - min) / span, label: { show: true, position: "right" } })), links: (current.value.links ?? []).filter((link) => visible.has(link.source) && visible.has(link.target)).map((link) => ({ ...link, lineStyle: { width: 0.8 + (1 - link.value) * 3, opacity: 0.45 } })), emphasis: { focus: "adjacency" } }],
    };
  }
  const matched = selectedSubjects.value.filter((name) => current.value?.series[name]);
  const available = Object.keys(current.value.series);
  const visible = matched.length ? matched : available.slice(0, 4);
  return lineChartOption(current.value.x, visible.map((name) => ({ name, data: (current.value?.series[name] ?? []) as Array<number | null> })), current.value.title || "value", "year");
});
</script>

<template>
  <div class="page-wrap">
    <PageIntro v-if="bundle" :eyebrow="bundle.eyebrow" :title="bundle.title" :description="bundle.description" />
    <ChartPanel :option="option" :loading="!bundle && !error" :error="error" :source="bundle?.source ?? 'legacy API static export'">
      <template v-if="bundle" #controls>
        <label v-for="dimension in bundle.dimensions" :key="dimension.key" class="control">
          <span>{{ dimension.label }}</span>
          <select v-model="selections[dimension.key]"><option v-for="item in dimension.options" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        </label>
        <label v-if="showSeriesSelector" class="control grow"><span>系列（可搜索、多选）</span><SubjectTags v-model="selectedSubjects" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
