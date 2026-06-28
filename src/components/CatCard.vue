<script setup lang="ts">
/**
 * CatCard — 单只猫咪展示卡片
 * 用于 CatRoom 页面的网格展示
 */

import type { Cat } from '@/types/cat'

interface IProps {
  cat: Cat
  photoUrl: string
  breed: string
  isNew?: boolean
}

const props = withDefaults(defineProps<IProps>(), {
  isNew: false,
})

// Status display helpers
const statusEmoji: Record<string, string> = {
  healthy: '😺',
  sick: '🤒',
  runaway: '🏃',
  deceased: '🌈',
}

const statusLabel: Record<string, string> = {
  healthy: '健康',
  sick: '生病',
  runaway: '离家出走',
  deceased: '已离开',
}

const statusClass = $computed(() => `status-${props.cat.status}`)
</script>

<template>
  <button
    type="button"
    class="cat-card"
    :class="[statusClass, { 'is-new': isNew }]"
  >
    <!-- New badge -->
    <div v-if="isNew" class="new-badge">🆕 新伙伴！</div>

    <!-- Photo -->
    <div class="photo-wrap" :class="cat.status === 'sick' ? 'anim-cat-sick' : ''">
      <img
        v-if="photoUrl"
        :src="photoUrl"
        :alt="cat.name"
        class="cat-photo"
        :class="{
          'anim-cat-breathe': cat.status === 'healthy',
          'grayscale': cat.status === 'sick',
        }"
      />
      <div v-else class="cat-emoji-placeholder">
        🐱
      </div>
      <!-- Status badge -->
      <span class="status-badge">{{ statusEmoji[cat.status] }} {{ statusLabel[cat.status] }}</span>
    </div>

    <!-- Info -->
    <div class="info">
      <h3>{{ cat.name }}</h3>
      <p class="breed">{{ breed }}</p>

      <!-- Status bars -->
      <div class="status-bars">
        <div class="bar-row">
          <span class="bar-label">❤️</span>
          <div class="bar-track">
            <div class="bar-fill health" :style="{ width: cat.health + '%' }" />
          </div>
          <span class="bar-value">{{ cat.health }}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">🍖</span>
          <div class="bar-track">
            <div class="bar-fill hunger" :style="{ width: (100 - cat.hunger) + '%' }" />
          </div>
          <span class="bar-value">{{ 100 - cat.hunger }}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">💕</span>
          <div class="bar-track">
            <div class="bar-fill affection" :style="{ width: cat.affection + '%' }" />
          </div>
          <span class="bar-value">{{ cat.affection }}</span>
        </div>
      </div>
    </div>
  </button>
</template>

<style scoped lang="scss">
.cat-card {
  width: 100%;
  border: 0;
  padding: 0;
  text-align: left;
  font: inherit;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(93, 64, 55, 0.1);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(93, 64, 55, 0.15);
  }

  &:focus-visible {
    outline: 3px solid var(--color-cat-success, #5CC9A7);
    outline-offset: 3px;
  }

  &.is-new {
    border: 2px solid var(--color-cat-success, #5CC9A7);
    box-shadow: 0 4px 16px rgba(92, 201, 167, 0.2);
  }

  &.status-sick {
    border: 1px solid rgba(255, 152, 0, 0.3);
  }

  &.status-runaway {
    opacity: 0.7;
  }
}

.new-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--color-cat-success, #5CC9A7);
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  z-index: 2;
  animation: newPulse 1.5s ease-in-out infinite;
}

@keyframes newPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

.photo-wrap {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: linear-gradient(135deg, #FFF3E0, #FFE0B2);

  .cat-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &.grayscale {
      filter: grayscale(0.3);
    }
  }

  .cat-emoji-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
  }

  .status-badge {
    position: absolute;
    bottom: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 0.75rem;
    z-index: 1;
  }
}

.info {
  padding: 14px 16px;

  h3 {
    font-size: 1.1rem;
    color: var(--color-cat-dark, #4E342E);
    margin: 0 0 2px;
  }

  .breed {
    font-size: 0.8rem;
    color: var(--color-sub-text, #8D6E63);
    margin: 0 0 10px;
  }
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;

  .bar-label {
    width: 20px;
    font-size: 0.8rem;
  }

  .bar-track {
    flex: 1;
    height: 6px;
    background: #eee;
    border-radius: 3px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;

      &.health {
        background: linear-gradient(90deg, #EF5350, #66BB6A);
      }

      &.hunger {
        background: linear-gradient(90deg, #FFA726, #FFEE58);
      }

      &.affection {
        background: linear-gradient(90deg, #EC407A, #AB47BC);
      }
    }
  }

  .bar-value {
    font-size: 0.7rem;
    color: #999;
    width: 24px;
    text-align: right;
  }
}
</style>
