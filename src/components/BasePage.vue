<script setup lang="ts">

</script>

<template>
  <div class="flex justify-center">
    <main class="page">
      <slot></slot>
    </main>
  </div>
</template>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  width: min(70vw, 72rem);
  min-height: calc(100vh - 1.2rem);
  margin-top: 1.2rem;
}

@media (min-width: 1536px) {
  .page {
    width: min(50vw, 72rem);
  }
}

@media (max-width: 768px) {
  .page {
    width: calc(100% - 1.5rem);
    margin: 0.75rem;
  }
}
</style>
