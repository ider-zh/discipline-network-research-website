<script setup lang="ts">
import { ArrowUpRight, ExternalLink } from "lucide-vue-next";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { ChartCatalogItem } from "../catalog";
import { catalogMeta } from "../catalogMeta";

const props = defineProps<{ chart: ChartCatalogItem; index?: number }>();
const meta = catalogMeta(props.chart);
const linkComponent = computed(() => props.chart.externalUrl ? "a" : RouterLink);
const linkAttributes = computed(() => props.chart.externalUrl
  ? { href: props.chart.externalUrl, target: "_blank", rel: "noopener noreferrer" }
  : { to: props.chart.path });
</script>

<template>
  <component :is="linkComponent" class="chart-card" v-bind="linkAttributes" :style="{ '--accent': chart.accent }">
    <span v-if="index !== undefined" class="card-index">{{ String(index + 1).padStart(2, "0") }}</span>
    <div class="card-tags">
      <span>{{ meta.dataset }}</span><span>{{ meta.kind }}</span><span v-if="chart.externalUrl">外部项目</span>
    </div>
    <p class="card-eyebrow">{{ chart.eyebrow }}</p>
    <h3>{{ chart.title }}</h3>
    <p>{{ chart.description }}</p>
    <div class="topic-tags"><span v-for="tag in meta.topics.slice(0, 2)" :key="tag"># {{ tag }}</span></div>
    <div class="card-footer"><span>{{ chart.source }}</span><ExternalLink v-if="chart.externalUrl" :size="18" /><ArrowUpRight v-else :size="19" /></div>
  </component>
</template>
