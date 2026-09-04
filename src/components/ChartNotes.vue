<script setup lang="ts">
import DOMPurify from "dompurify";
import type { ECharts } from "echarts/core";
import katex from "katex";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { loadJson } from "../data";
import "katex/dist/katex.min.css";
import "markdown-it-texmath/css/texmath.css";

type NoteDocument = { title: string; sourceKeys: string[]; markdown: string };

const props = defineProps<{ noteId?: string }>();
const route = useRoute();
const note = ref<NoteDocument>();
const error = ref("");
const body = ref<HTMLElement>();
const chartInstances: ECharts[] = [];
const resolvedId = computed(() => props.noteId ?? String(route.path.split("/").filter(Boolean).at(-1) ?? "home"));
const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(texmath, {
  engine: katex,
  delimiters: "dollars",
  katexOptions: { throwOnError: false, strict: false },
});
const defaultFence = markdown.renderer.rules.fence;
markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
  if (tokens[index].info.trim().toLowerCase() !== "echarts") {
    const renderedFence = defaultFence ? defaultFence(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
    const lineCount = tokens[index].content.split("\n").length - 1;
    return lineCount > 30
      ? `<details class="note-code"><summary>查看计算代码（${lineCount} 行）</summary>${renderedFence}</details>`
      : renderedFence;
  }
  const renderEnvironment = (env ?? {}) as { noteChartIndex?: number };
  const chartIndex = renderEnvironment.noteChartIndex ?? 0;
  renderEnvironment.noteChartIndex = chartIndex + 1;
  return `<div class="note-echart" data-note-chart="${chartIndex}" role="img" aria-label="笔记中的补充图表"></div>`;
};

watch(resolvedId, async (id) => {
  note.value = undefined;
  error.value = "";
  try { note.value = await loadJson<NoteDocument>(`/data/notes/${id}.json`); }
  catch (reason) {
    if (reason instanceof Error && !reason.message.includes("404")) error.value = reason.message;
  }
}, { immediate: true });

const rendered = computed(() => note.value
  ? DOMPurify.sanitize(markdown.render(note.value.markdown, { noteChartIndex: 0 }), { ADD_ATTR: ["target"] })
  : "");

function chartOptions(source: string) {
  return [...source.matchAll(/```echarts\s*\n([\s\S]*?)```/gi)].flatMap((match) => {
    try { return [JSON.parse(match[1])]; }
    catch { return []; }
  });
}

function disposeCharts() {
  chartInstances.splice(0).forEach((chart) => chart.dispose());
}

watch(rendered, async () => {
  disposeCharts();
  await nextTick();
  const options = chartOptions(note.value?.markdown ?? "");
  if (!options.length) return;
  const [, { init }] = await Promise.all([import("../echarts"), import("echarts/core")]);
  body.value?.querySelectorAll<HTMLElement>(".note-echart").forEach((element, index) => {
    if (!options[index]) return;
    const chart = init(element);
    chart.setOption({ ...options[index], animation: false, toolbox: { right: 12, feature: { saveAsImage: {}, restore: {} } } });
    chartInstances.push(chart);
  });
}, { flush: "post" });

const resizeObserver = new ResizeObserver(() => chartInstances.forEach((chart) => chart.resize()));
watch(body, (element, previous) => {
  if (previous) resizeObserver.unobserve(previous);
  if (element) resizeObserver.observe(element);
});
onBeforeUnmount(() => { resizeObserver.disconnect(); disposeCharts(); });
</script>

<template>
  <section v-if="note || error" class="note-shell" aria-labelledby="chart-note-title">
    <div class="note-card">
      <header class="note-header">
        <div><p class="eyebrow">Archived context · read only</p><h2 id="chart-note-title">{{ note?.title ?? "研究笔记" }}</h2></div>
        <span v-if="note">旧站手写内容，经格式清理后静态归档</span>
      </header>
      <!-- eslint-disable-next-line vue/no-v-html -- sanitized immediately before rendering -->
      <div v-if="note" ref="body" class="markdown-body" v-html="rendered"></div>
      <p v-else class="note-error">笔记加载失败：{{ error }}</p>
    </div>
  </section>
</template>
