<script setup lang="ts">
import CatAvatar from '@/components/CatAvatar.vue'
import { useCatStore } from '@/stores/cat'

defineProps<{
  compact?: boolean
}>()

const catStore = useCatStore()
</script>

<template>
  <section class="cat-hud" :class="{ compact }" aria-label="猫咖状态">
    <CatAvatar v-if="!compact" size="medium" />
    <div class="hud-item">
      <span class="hud-value">{{ catStore.catCount }}</span>
      <span class="hud-label">只猫咪</span>
    </div>
    <div class="hud-item">
      <span class="hud-value">{{ Math.max(0, catStore.points) }}</span>
      <span class="hud-label">积分</span>
    </div>
    <div class="hud-item attention">
      <span class="hud-value">{{ catStore.warningCatCount }}</span>
      <span class="hud-label">待照护</span>
    </div>
    <div class="hud-item collection">
      <span class="hud-value">{{ catStore.collectionProgress }}%</span>
      <span class="hud-label">图鉴</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cat-hud {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: fit-content;
  max-width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid rgba(255, 107, 107, 0.35);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 28px rgba(78, 52, 46, 0.08);
  backdrop-filter: blur(8px);
}

.hud-item {
  display: flex;
  flex-direction: column;
  min-width: 3.5rem;
  text-align: center;

  .hud-value {
    color: var(--color-cat-dark);
    font-size: 1.15rem;
    font-weight: 800;
  }

  .hud-label {
    color: var(--color-cat-neutral);
    font-size: 0.72rem;
  }
}

.attention .hud-value { color: var(--color-cat-encourage); }
.collection .hud-value { color: var(--color-cat-premium); }

.compact {
  gap: 0.65rem;
  padding: 0.45rem 0.65rem;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(3.25rem, 1fr));
  }
}

@media (max-width: 520px) {
  .cat-hud {
    display: grid;
    grid-template-columns: auto repeat(2, minmax(3.25rem, 1fr));
    width: 100%;
    box-sizing: border-box;
  }

  .cat-avatar { grid-row: span 2; }
}
</style>
