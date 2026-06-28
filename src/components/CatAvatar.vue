<script setup lang="ts">
import huanuAvatar from '@/assets/img/cat-avatar-huanu.jpg'

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
  overflow: hidden;
  flex: 0 0 auto;
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: var(--color-cat-cream);
  box-shadow: 0 6px 18px rgba(78, 52, 46, 0.18);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 34%;
  }
}

.cat-avatar-small { width: 2.5rem; height: 2.5rem; }
.cat-avatar-medium { width: 4rem; height: 4rem; }
.cat-avatar-large { width: 7rem; height: 7rem; }
</style>
