<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson, round } from "../data";

type EntropyData = Record<string, Record<string, unknown[]>>;
const datasets = ref<Record<string, EntropyData>>({});
const level = ref("lv2");
const direction = ref<"in" | "out" | "all">("all");
const metric = ref<"normalized" | "entropy" | "directed-density" | "undirected-density">("normalized");
const selected = ref(["Biology", "Computer science", "Mathematics"]);
const error = ref("");

onMounted(async () => {
  try {
    const [lv2, lv3] = await Promise.all([loadJson<EntropyData>("/data/wikipedia-struct-entropy-lv2.json"), loadJson<EntropyData>("/data/wikipedia-struct-entropy-lv3.json")]);
    datasets.value = { lv2, lv3 };
  } catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const subjects = computed(() => Object.keys(datasets.value[level.value] ?? {}).sort());
const quarters = Array.from({ length: 81 }, (_, index) => `${2001 + Math.floor(index / 4)}Q${index % 4 + 1}`);
const key = computed(() => metric.value === "normalized" ? direction.value : metric.value === "entropy" ? `${direction.value}_e` : metric.value === "directed-density" ? "d_d" : "d_n");
const label = computed(() => ({ normalized: "normalized structural entropy", entropy: "structural entropy", "directed-density": "directed density", "undirected-density": "undirected density" })[metric.value]);
const option = computed<EChartsCoreOption | undefined>(() => datasets.value[level.value] ? lineChartOption(
  quarters,
  selected.value.map((name) => ({ name, data: [...Array(12).fill(null), ...(datasets.value[level.value]?.[name]?.[key.value] ?? []).map((value) => round(value, 6))] })),
  label.value,
  "quarter",
) : undefined);
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Wikipedia · Structure" title="Structural Entropy" description="比较标准结构熵、原始结构熵及网络密度的长期变化。" />
    <ChartPanel :option="option" :loading="!Object.keys(datasets).length && !error" :error="error" source="Wikipedia structural entropy lv2/lv3 · log₂ snapshot">
      <template #controls>
        <label class="control"><span>网络层次</span><select v-model="level"><option value="lv2">Level 2</option><option value="lv3">Level 3</option></select></label>
        <label class="control"><span>指标</span><select v-model="metric"><option value="normalized">标准结构熵</option><option value="entropy">结构熵</option><option value="directed-density">有向网络密度</option><option value="undirected-density">无向网络密度</option></select></label>
        <label v-if="metric === 'normalized' || metric === 'entropy'" class="control"><span>方向</span><select v-model="direction"><option value="in">入度</option><option value="out">出度</option><option value="all">无向</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
