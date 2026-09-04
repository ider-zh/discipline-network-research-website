<script setup lang="ts">
import { Github, Menu, Network, X } from "lucide-vue-next";
import { computed, defineAsyncComponent, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { chartHasNote } from "./notes";

const menuOpen = ref(false);
const route = useRoute();
const ChartNotes = defineAsyncComponent(() => import("./components/ChartNotes.vue"));
const showChartNote = computed(() => chartHasNote(route.path));
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" @click="menuOpen = false">
        <span class="brand-mark"><Network :size="21" /></span>
        <span>Discipline Atlas</span>
      </RouterLink>
      <nav :class="['main-nav', { open: menuOpen }]" aria-label="主要导航">
        <RouterLink to="/" @click="menuOpen = false">总览</RouterLink>
        <RouterLink to="/charts" @click="menuOpen = false">图表库</RouterLink>
        <RouterLink :to="{ path: '/charts', query: { dataset: 'OpenAlex' } }" @click="menuOpen = false">OpenAlex</RouterLink>
        <RouterLink :to="{ path: '/charts', query: { dataset: 'Wikipedia' } }" @click="menuOpen = false">Wikipedia</RouterLink>
        <RouterLink :to="{ path: '/charts', query: { dataset: 'MAG' } }" @click="menuOpen = false">MAG</RouterLink>
        <RouterLink :to="{ path: '/charts', query: { dataset: 'Web of Science' } }" @click="menuOpen = false">Web of Science</RouterLink>
      </nav>
      <a class="source-link" href="https://github.com/iwuzhen/subject-relevance" target="_blank" rel="noreferrer">
        <Github :size="18" /> <span>Source</span>
      </a>
      <button class="menu-button" type="button" aria-label="切换导航" @click="menuOpen = !menuOpen">
        <X v-if="menuOpen" :size="22" />
        <Menu v-else :size="22" />
      </button>
    </header>

    <main>
      <RouterView />
      <ChartNotes v-if="showChartNote" />
    </main>

    <footer class="site-footer">
      <span>Discipline Atlas</span>
      <span>Static research visualizations · Snapshot 2026</span>
    </footer>
  </div>
</template>
