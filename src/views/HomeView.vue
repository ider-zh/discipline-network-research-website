<script setup lang="ts">
import { ArrowRight, ArrowUpRight, DatabaseZap, Gauge, PanelsTopLeft } from "lucide-vue-next";
import { defineAsyncComponent } from "vue";
import { chartCatalog } from "../catalog";
import { datasetCount, datasetOrder } from "../catalogMeta";
import ChartCard from "../components/ChartCard.vue";

const ChartNotes = defineAsyncComponent(() => import("../components/ChartNotes.vue"));
const featuredPaths = [
  "/charts/openalex-concepts",
  "/charts/openalex-entropy",
  "/charts/wikipedia-network",
  "/charts/wikipedia-structural-entropy",
  "/charts/mag-citation-network",
  "/charts/mag-disruption-structure",
];
const featured = featuredPaths.map((path) => chartCatalog.find((chart) => chart.path === path)).filter((chart): chart is typeof chartCatalog[number] => Boolean(chart));
const datasets = datasetOrder.slice(0, 4).map((name) => ({ name, count: datasetCount(name, chartCatalog) }));
</script>

<template>
  <div class="home-page">
    <section class="hero">
      <div>
        <p class="eyebrow">Knowledge systems · mapped</p>
        <h1>看见学科之间<br /><em>如何连接与演化</em></h1>
        <p class="hero-copy">将 Wikipedia、OpenAlex 与 Web of Science 的复杂网络，转化为可探索、可复现、可静态部署的研究图表。</p>
        <RouterLink class="primary-action" to="/charts">浏览图表库 <ArrowUpRight :size="18" /></RouterLink>
      </div>
      <div class="hero-orbit" aria-hidden="true">
        <span class="orbit orbit-a"></span><span class="orbit orbit-b"></span><span class="orbit orbit-c"></span>
        <span class="orbit-core">{{ chartCatalog.length }}<small>charts</small></span>
      </div>
    </section>

    <section class="principles" aria-label="项目原则">
      <div><PanelsTopLeft /><strong>静态优先</strong><span>Cloudflare Pages 原生交付</span></div>
      <div><DatabaseZap /><strong>数据可追溯</strong><span>快照、来源与转换均记录</span></div>
      <div><Gauge /><strong>按需加载</strong><span>每个路由只下载所需数据</span></div>
    </section>

    <section class="dataset-section">
      <div class="section-heading"><div><p class="eyebrow">Browse by dataset</p><h2>从数据源开始</h2></div><p>每张图表都归入明确的数据集和研究主题；跨库比较会在图表库中同时出现在相关筛选结果里。</p></div>
      <div class="dataset-grid">
        <RouterLink v-for="item in datasets" :key="item.name" :to="{ path: '/charts', query: { dataset: item.name } }">
          <span>{{ item.name }}</span><strong>{{ item.count }}</strong><small>charts</small><ArrowRight :size="20" />
        </RouterLink>
      </div>
    </section>

    <section class="catalog-section featured-section">
      <div class="section-heading">
        <div><p class="eyebrow">Curated views</p><h2>精选研究视图</h2></div>
        <div class="section-action"><p>先从具有代表性的层次树、网络与复杂度研究开始。</p><RouterLink to="/charts">查看全部 {{ chartCatalog.length }} 张 <ArrowRight :size="17" /></RouterLink></div>
      </div>
      <div class="chart-grid">
        <ChartCard v-for="(chart, index) in featured" :key="chart.path" :chart="chart" :index="index" />
      </div>
    </section>

    <ChartNotes note-id="home" />
  </div>
</template>
