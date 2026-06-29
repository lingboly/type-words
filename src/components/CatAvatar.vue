<script setup lang="ts">
import huanuAvatar from '@/assets/img/cat-avatar-huanu-transparent.png'

withDefaults(defineProps<{
  size?: 'small' | 'medium' | 'large'
  label?: string
}>(), {
  size: 'medium',
  label: '花奴，知识猫咖向导',
})
</script>

<template>
  <span class="cat-avatar" :class="`cat-avatar-${size}`">
    <img :src="huanuAvatar" :alt="label" />
  </span>
</template>

<style scoped lang="scss">
.cat-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  background: transparent;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.cat-avatar-small { width: 2.5rem; height: 2.5rem; }
.cat-avatar-medium { width: 4rem; height: 4rem; }
.cat-avatar-large { width: 7rem; height: 7rem; }
</style>
