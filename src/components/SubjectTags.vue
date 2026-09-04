<script setup lang="ts">
import Multiselect from "@vueform/multiselect";
import "@vueform/multiselect/themes/default.css";

defineProps<{ options: string[]; placeholder?: string }>();
const model = defineModel<string[]>({ required: true });

function updateModel(value: string[] | null) {
  model.value = value?.length ? value : [...model.value];
}
</script>

<template>
  <Multiselect
    :model-value="model"
    mode="tags"
    :options="options"
    :searchable="true"
    :close-on-select="false"
    :can-deselect="model.length > 1"
    :can-clear="false"
    :placeholder="placeholder ?? '输入学科名称筛选'"
    @update:model-value="updateModel"
  />
</template>
