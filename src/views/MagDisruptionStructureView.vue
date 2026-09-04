<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson } from "../data";

type Mode = "trend" | "in" | "out";
type SubjectData = { y: number[]; in: number[]; out: number[] };
type DisruptionData = { data: Record<string, SubjectData>; subject: string[] };
const snapshot = ref<DisruptionData>({ data: {}, subject: [] });
const selected = ref(["Biology", "Chemistry", "Computer science", "Mathematics", "Medicine", "Physics"]);
const mode = ref<Mode>("trend");
const percentile = ref(100);
const threshold = ref(0.01);
const error = ref("");

onMounted(async () => {
  try { snapshot.value = await loadJson<DisruptionData>("/data/mag-disruption-structure.json"); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const subjects = computed(() => Object.keys(snapshot.value.data).sort());
const option = computed<EChartsCoreOption | undefined>(() => {
  if (!subjects.value.length || !selected.value.length) return undefined;
  if (mode.value === "trend") {
    const count = Math.floor(percentile.value / 5);
    return lineChartOption(
      Array.from({ length: count }, (_, index) => (index + 1) * 5),
      selected.value.map((name) => ({ name, data: snapshot.value.data[name]?.y.slice(0, count) ?? [] })),
      "average disruption",
      "top percentile (%)",
    );
  }
  const direction: "in" | "out" = mode.value;
  const suffix = " ";
  const links = selected.value.flatMap((name) => (snapshot.value.data[name]?.[direction] ?? []).flatMap((value: number, index: number) =>
    value >= threshold.value ? [{ source: name, target: `${snapshot.value.subject[index]}${suffix}`, value }] : [],
  ));
  const targetNames = new Set(links.map((link) => link.target));
  return {
    color: ["#f05d23", "#396afc", "#8a4fff", "#00a896", "#dc3f63", "#d6a21d"],
    tooltip: { trigger: "item" },
    toolbox: { feature: { saveAsImage: {}, restore: {} } },
    series: [{
      type: "sankey",
      left: 24,
      right: 150,
      nodeWidth: 16,
      nodeGap: 10,
      emphasis: { focus: "adjacency" },
      lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.36 },
      data: [
        ...selected.value.map((name) => ({ name, depth: 0 })),
        ...[...targetNames].map((name) => ({ name, depth: 1 })),
      ],
      links,
    }],
  };
});
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="MAG · Disruption" title="Disruption Structure" description="比较不同论文排名区间的平均颠覆度，或用桑基图查看高颠覆论文的跨学科引用流向。" />
    <ChartPanel :option="option" :loading="!subjects.length && !error" :error="error || (!selected.length ? '请至少选择一个学科' : '')" source="disruption.json · pinned upstream snapshot" tall>
      <template #controls>
        <label class="control"><span>视图</span><select v-model="mode"><option value="trend">百分位趋势</option><option value="in">linksin · 被引用分布</option><option value="out">linksout · 引用分布</option></select></label>
        <label v-if="mode === 'trend'" class="control range"><span>显示至 Top {{ percentile }}%</span><input v-model.number="percentile" type="range" min="5" max="100" step="5"></label>
        <label v-else class="control range"><span>最小流量 {{ threshold.toFixed(3) }}</span><input v-model.number="threshold" type="range" min="0.001" max="0.05" step="0.001"></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
