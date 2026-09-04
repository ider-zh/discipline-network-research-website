<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import { lineChartOption } from "../charting";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson } from "../data";

type ArticleData = { data: Record<string, number[]>; dxdata: Record<string, number[]>; xdata: string[] };
const data = ref<ArticleData>();
const mode = ref<"data" | "dxdata">("data");
const selected = ref(["Computer science", "Biology", "Mathematics"]);
const error = ref("");

onMounted(async () => {
  try { data.value = await loadJson<ArticleData>("/data/wikipedia-article-count.json"); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const subjects = computed(() => Object.keys(data.value?.data ?? {}).sort());
const option = computed<EChartsCoreOption | undefined>(() => data.value
  ? lineChartOption(data.value.xdata, selected.value.map((name) => ({ name, data: data.value?.[mode.value][name] ?? [] })), mode.value === "data" ? "articles" : "monthly change", "month")
  : undefined);
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Wikipedia · Scale" title="Article Count by Discipline" description="按月比较 Wikipedia 学科学术圈的文章规模及其净变化。" />
    <ChartPanel :option="option" :loading="!data && !error" :error="error" source="subject_article_count.json · upstream static snapshot">
      <template #controls>
        <label class="control"><span>数据维度</span><select v-model="mode"><option value="data">文章总量</option><option value="dxdata">月度净变化</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
