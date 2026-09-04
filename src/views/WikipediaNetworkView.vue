<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import { loadJson } from "../data";

type Network = { nodes: Array<{ name: string; category: number }>; links: Array<[number, number, number]> };
const data = ref<Network>();
const error = ref("");
const labels = ref(true);
const repulsion = ref(520);
const colors = ["#f05d23", "#ffb000", "#396afc", "#8a4fff", "#00a896", "#54a0ff", "#718093", "#2f3640", "#dc3f63", "#9c88ff", "#44bd32", "#487eb0", "#e1b12c", "#c23616", "#0097e6", "#8c7ae6", "#273c75"];

onMounted(async () => {
  try { data.value = await loadJson<Network>("/data/wikipedia-subject-network.json"); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
});

const option = computed<EChartsCoreOption | undefined>(() => data.value ? ({
  color: colors,
  tooltip: { formatter: (params: { dataType: string; data: { name?: string; value?: number } }) => params.dataType === "edge" ? `相关距离：${params.data.value?.toFixed(4)}` : params.data.name },
  legend: { show: false },
  series: [{
    type: "graph", layout: "force", roam: true, draggable: true,
    data: data.value.nodes.map((node, index) => ({ ...node, id: String(index), symbolSize: 38, label: { show: labels.value, position: "right", formatter: "{b}" } })),
    links: data.value.links.map(([source, target, distance]) => ({ source: String(source), target: String(target), value: 1 - distance, lineStyle: { width: 2 + (1 - distance) * 4, opacity: 0.68 } })),
    categories: data.value.nodes.map((node) => ({ name: node.name })),
    force: { repulsion: repulsion.value, edgeLength: [100, 210], gravity: 0.08 },
    emphasis: { focus: "adjacency", lineStyle: { width: 7 } },
  }],
}) : undefined);
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="Wikipedia · Network" title="Subject Connection Tree" description="拖动节点、缩放画布，探索 Wikipedia 顶级学科之间的最小生成树；边越粗代表相关距离越近。" />
    <ChartPanel :option="option" :loading="!data && !error" :error="error" source="Wikipedia subject relevance minimum spanning tree" tall>
      <template #controls>
        <label class="toggle"><input v-model="labels" type="checkbox" /> 显示标签</label>
        <label class="control range"><span>节点斥力 {{ repulsion }}</span><input v-model.number="repulsion" type="range" min="200" max="1000" step="40" /></label>
        <span class="control-note">滚轮缩放 · 拖动平移 · 双击聚焦</span>
      </template>
    </ChartPanel>
  </div>
</template>
