<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";

defineProps<{ eyebrow: string; title: string; description: string }>();
</script>

<template>
  <header class="page-intro">
    <RouterLink class="back-link" to="/"><ArrowLeft :size="16" /> 返回总览</RouterLink>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1>{{ title }}</h1>
    <p class="lede">{{ description }}</p>
  </header>
</template>
