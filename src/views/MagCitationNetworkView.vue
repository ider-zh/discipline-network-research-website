<script setup lang="ts">
import type { EChartsCoreOption } from "echarts/core";
import { computed, onMounted, ref } from "vue";
import ChartPanel from "../components/ChartPanel.vue";
import PageIntro from "../components/PageIntro.vue";
import SubjectTags from "../components/SubjectTags.vue";
import { loadJson, round } from "../data";

type Year = "2016" | "2017";
type Direction = "linksin" | "linksout";
type NodeRow = { Id: string; Label: string; weight: string };
type EdgeRow = { Source: string; Target: string; Weight: string };

const year = ref<Year>("2016");
const direction = ref<Direction>("linksin");
const nodesByYear = ref<Record<Year, NodeRow[]>>({ 2016: [], 2017: [] });
const edges = ref<EdgeRow[]>([]);
const selected = ref(["Biology", "Chemistry", "Computer science", "Mathematics", "Medicine", "Physics"]);
const error = ref("");
const loading = ref(true);

async function loadEdges() {
  loading.value = true;
  error.value = "";
  try { edges.value = await loadJson<EdgeRow[]>(`/data/mag-network-${direction.value}-${year.value}.json`); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : "数据加载失败"; }
  finally { loading.value = false; }
}

onMounted(async () => {
  try {
    const [nodes2016, nodes2017] = await Promise.all([
      loadJson<NodeRow[]>("/data/mag-network-nodes-2016.json"),
      loadJson<NodeRow[]>("/data/mag-network-nodes-2017.json"),
    ]);
    nodesByYear.value = { 2016: nodes2016, 2017: nodes2017 };
    await loadEdges();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "数据加载失败";
    loading.value = false;
  }
});

const subjects = computed(() => nodesByYear.value[year.value].map((node) => node.Label).sort());
const option = computed<EChartsCoreOption | undefined>(() => {
  const chosen = new Set(selected.value);
  const nodes = nodesByYear.value[year.value].filter((node) => chosen.has(node.Label));
  if (!nodes.length) return undefined;
  const ids = new Set(nodes.map((node) => node.Id));
  const weights = nodes.map((node) => Math.sqrt(Number(node.weight)));
  const min = Math.min(...weights);
  const span = Math.max(1, Math.max(...weights) - min);
  return {
    animation: false,
    color: ["#f05d23", "#396afc", "#8a4fff", "#00a896", "#dc3f63", "#d6a21d"],
    tooltip: { trigger: "item" },
    legend: { show: false },
    toolbox: { feature: { saveAsImage: {}, restore: {} } },
    series: [{
      type: "graph",
      layout: "force",
      roam: true,
      draggable: true,
      force: { repulsion: 320, gravity: 0.08, edgeLength: [70, 210], layoutAnimation: false },
      data: nodes.map((node) => ({
        id: node.Id,
        name: node.Label,
        value: Number(node.weight),
        symbolSize: 14 + 38 * (Math.sqrt(Number(node.weight)) - min) / span,
        label: { show: true, position: "right", fontSize: 11 },
      })),
      links: edges.value.filter((edge) => ids.has(edge.Source) && ids.has(edge.Target)).map((edge) => ({
        source: edge.Source,
        target: edge.Target,
        value: round(Number(edge.Weight), 4),
        lineStyle: { width: 0.5 + Math.min(4, Number(edge.Weight) * 5), opacity: 0.42, curveness: 0.08 },
      })),
      emphasis: { focus: "adjacency", lineStyle: { opacity: 0.9, width: 2 } },
    }],
  };
});
</script>

<template>
  <div class="page-wrap">
    <PageIntro eyebrow="MAG · Citation Network" title="Discipline Citation Network" description="按年份和引用方向查看 MAG 学科间关系；拖动节点、滚轮缩放，悬停可突出相邻连接。" />
    <ChartPanel :option="option" :loading="loading" :error="error || (!selected.length ? '请至少选择一个学科' : '')" source="MAG 2016/2017 node and directed-edge snapshots" tall>
      <template #controls>
        <label class="control"><span>年份</span><select v-model="year" @change="loadEdges"><option value="2016">2016</option><option value="2017">2017</option></select></label>
        <label class="control"><span>引用方向</span><select v-model="direction" @change="loadEdges"><option value="linksin">linksin · 被引用</option><option value="linksout">linksout · 引用</option></select></label>
        <label class="control grow"><span>学科（可搜索、多选）</span><SubjectTags v-model="selected" :options="subjects" /></label>
      </template>
    </ChartPanel>
  </div>
</template>
