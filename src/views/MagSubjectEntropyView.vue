<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson } from "../data";

type MagData = Record<string, Record<string, number[]>>;
const data = ref<MagData>({});
const metric = ref<"E" | "e" | "d" | "s">("E");
const direction = ref<"i" | "o" | "a">("a");
const selected = ref(["Biology", "Computer science", "Mathematics"]);
const error = ref("");
const metricLabels = { E: "normalized entropy", e: "entropy", d: "average degree", s: "network size" };

onMounted(async () => {
  try { data.value = await loadJson<MagData>("/data/mag-subject-entropy.json"); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const subjects = computed(() => Object.keys(data.value).sort());
const years = Array.from({ length: 121 }, (_, index) => 1900 + index);
const option = computed<EChartsCoreOption | undefined>(() => subjects.value.length ? lineChartOption(
  years,
  selected.value.map((name) => ({ name, data: data.value[name]?.[`${metric.value}_${direction.value}`] ?? [] })),
  metricLabels[metric.value],
  "year",
) : undefined);
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Microsoft Academic Graph · Entropy" title="MAG Subject Entropy" description="回看 1900–2020 年主要学科网络的熵、平均度和规模变化。" />
    <ChartPanel :option="option" :loading="!subjects.length && !error" :error="error" source="MAGSubjectEntropy.json · upstream static snapshot">
      <template #controls>
        <label class="control"><span>指标</span><select v-model="metric"><option value="E">标准熵</option><option value="e">熵</option><option value="d">平均度</option><option value="s">网络规模</option></select></label>
        <label class="control"><span>方向</span><select v-model="direction"><option value="i">入度</option><option value="o">出度</option><option value="a">无向</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
