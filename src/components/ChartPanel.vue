<script setup lang="ts">
import { AlertCircle, Database, LoaderCircle } from "lucide-vue-next";
import type { ECBasicOption } from "echarts/types/dist/shared";
import VChart from "vue-echarts";
import "../echarts";

defineProps<{
  option?: ECBasicOption;
  loading?: boolean;
  error?: string;
  source: string;
  tall?: boolean;
}>();

defineEmits<{ chartClick: [event: unknown] }>();
</script>

<template>
  <section class="chart-panel">
    <div v-if="$slots.controls" class="chart-controls"><slot name="controls" /></div>
    <div :class="['chart-stage', { tall }]">
      <div v-if="loading" class="chart-state"><LoaderCircle class="spin" /> 正在读取静态数据</div>
      <div v-else-if="error" class="chart-state error"><AlertCircle /> {{ error }}</div>
      <div v-else-if="$slots.default" class="chart-content"><slot /></div>
      <VChart v-else-if="option" class="chart" :option="option" autoresize @click="$emit('chartClick', $event)" />
    </div>
    <div class="chart-source"><Database :size="14" /> 数据源：{{ source }} · 构建期静态快照</div>
  </section>
</template>
