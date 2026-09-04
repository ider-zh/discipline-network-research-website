<script setup lang="ts">
import { Search, SlidersHorizontal, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { chartCatalog } from "../catalog";
import { catalogMeta, datasetOrder, matchesCatalog, topicOrder } from "../catalogMeta";
import ChartCard from "../components/ChartCard.vue";

const route = useRoute();
const router = useRouter();
const query = ref(String(route.query.q ?? ""));
const dataset = ref(String(route.query.dataset ?? ""));
const topic = ref(String(route.query.topic ?? ""));

const results = computed(() => chartCatalog.filter((chart) => matchesCatalog(chart, query.value, dataset.value, topic.value)));
const groups = computed(() => datasetOrder.flatMap((name) => {
  const charts = results.value.filter((chart) => catalogMeta(chart).dataset === name);
  return charts.length ? [{ name, charts }] : [];
}));
const hasFilters = computed(() => Boolean(query.value || dataset.value || topic.value));

watch([query, dataset, topic], () => {
  const next = Object.fromEntries(Object.entries({ q: query.value.trim(), dataset: dataset.value, topic: topic.value }).filter(([, value]) => value));
  void router.replace({ query: next });
});
watch(() => route.query, (next) => {
  query.value = String(next.q ?? "");
  dataset.value = String(next.dataset ?? "");
  topic.value = String(next.topic ?? "");
});

function clearFilters() {
  query.value = "";
  dataset.value = "";
  topic.value = "";
}
</script>

<template>
  <div class="library-page">
    <header class="library-hero">
      <div><p class="eyebrow">Research chart library</p><h1>图表库</h1></div>
      <p>按数据集与研究问题组织 {{ chartCatalog.length }} 张静态图表。搜索会同时匹配标题、指标、来源和标签。</p>
    </header>

    <section class="catalog-toolbar" aria-label="图表搜索与筛选">
      <label class="library-search"><Search :size="19" /><span class="sr-only">搜索图表</span><input v-model="query" type="search" placeholder="搜索 chart、指标或数据来源…" /></label>
      <div class="filter-row">
        <span class="filter-label"><SlidersHorizontal :size="15" /> 数据集</span>
        <button :class="{ active: !dataset }" type="button" @click="dataset = ''">全部</button>
        <button v-for="item in datasetOrder" :key="item" :class="{ active: dataset === item }" type="button" @click="dataset = dataset === item ? '' : item">{{ item }}</button>
      </div>
      <div class="filter-row topics">
        <span class="filter-label">研究主题</span>
        <button :class="{ active: !topic }" type="button" @click="topic = ''">全部</button>
        <button v-for="item in topicOrder" :key="item" :class="{ active: topic === item }" type="button" @click="topic = topic === item ? '' : item">{{ item }}</button>
      </div>
    </section>

    <div class="results-line">
      <span>找到 <strong>{{ results.length }}</strong> 张图表</span>
      <button v-if="hasFilters" type="button" @click="clearFilters"><X :size="15" />清除筛选</button>
    </div>

    <div v-if="groups.length" class="catalog-groups">
      <section v-for="group in groups" :key="group.name" class="catalog-group">
        <div class="group-heading"><h2>{{ group.name }}</h2><span>{{ group.charts.length }} charts</span></div>
        <div class="chart-grid library-grid"><ChartCard v-for="chart in group.charts" :key="chart.path" :chart="chart" /></div>
      </section>
    </div>
    <section v-else class="empty-results"><Search :size="28" /><h2>没有匹配的图表</h2><p>尝试缩短关键词，或清除数据集与主题筛选。</p><button type="button" @click="clearFilters">查看全部图表</button></section>
  </div>
</template>
