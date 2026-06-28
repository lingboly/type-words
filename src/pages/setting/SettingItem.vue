<script setup lang="ts">
defineProps<{
  mainTitle?: string,
  title?: string,
  desc?: string,
}>()
</script>

<template>
  <div class="setting-item flex items-center gap-40" :class="desc ? 'mt-4' : 'my-4'" v-bind="$attrs">
    <span v-if="title">{{ title }}</span>
    <span class="text-xl font-bold" v-if="mainTitle">{{ mainTitle }}</span>
    <div class="setting-control flex flex-1 justify-end">
      <slot></slot>
    </div>
  </div>
  <div class="text-sm mb-3" v-if="desc">{{ desc }}</div>
</template>

<style scoped lang="scss">
@media (max-width: 768px) {
  .setting-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-control {
    width: 100%;
    justify-content: flex-start;
  }
}

</style>
