<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import { onMounted } from "vue";

const props = defineProps<{ title: string; url: string }>();
onMounted(() => window.location.replace(props.url));
</script>

<template>
  <div class="external-redirect">
    <p class="eyebrow">External project</p>
    <h1>正在打开 {{ title }}</h1>
    <p>如果浏览器没有自动跳转，请使用下面的链接。</p>
    <a :href="url">前往外部项目 <ExternalLink :size="17" /></a>
  </div>
</template>
