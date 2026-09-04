<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson, round } from "../data";

type Direction = "i" | "o" | "a";
type EntropyData = Record<string, Record<Direction, unknown[]>>;
const datasets = ref<Record<string, EntropyData>>({});
const level = ref("lv2");
const direction = ref<Direction>("a");
const selected = ref(["Biology", "Computer science", "Mathematics"]);
const error = ref("");

onMounted(async () => {
  try {
    const [lv2, lv3] = await Promise.all([loadJson<EntropyData>("/data/wikipedia-degree-entropy-lv2.json"), loadJson<EntropyData>("/data/wikipedia-degree-entropy-lv3.json")]);
    datasets.value = { lv2, lv3 };
  } catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const subjects = computed(() => Object.keys(datasets.value[level.value] ?? {}).sort());
const quarters = Array.from({ length: 81 }, (_, index) => `${2001 + Math.floor(index / 4)}Q${index % 4 + 1}`);
const option = computed<EChartsCoreOption | undefined>(() => datasets.value[level.value] ? lineChartOption(
  quarters,
  selected.value.map((name) => ({ name, data: [...Array(12).fill(null), ...(datasets.value[level.value]?.[name]?.[direction.value] ?? []).map((value) => round(value, 4))] })),
  "degree entropy",
  "quarter",
) : undefined);
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Wikipedia · Entropy" title="Degree Distribution Entropy" description="观察 Wikipedia 学科网络度分布熵在季度尺度上的变化。" />
    <ChartPanel :option="option" :loading="!Object.keys(datasets).length && !error" :error="error" source="Wikipedia degree entropy lv2/lv3 · log₂ snapshot">
      <template #controls>
        <label class="control"><span>网络层次</span><select v-model="level"><option value="lv2">精简学术圈 · Level 2</option><option value="lv3">精简学术圈 · Level 3</option></select></label>
        <label class="control"><span>方向</span><select v-model="direction"><option value="i">入度</option><option value="o">出度</option><option value="a">无向</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
