<script setup lang="ts">
/**
 * CatCelebration — perfect-session celebration and adoption unlock notice
 *
 * Props:
 *   isPerfect: boolean — 是否全对（决定是否显示猫咪领养）
 *   points: number — 获得的积分
 *   catCount: number — 当前猫咪总数
 *   catPhotoKey?: string — 新领养猫咪的照片文件名
 *   catName?: string — 新领养猫咪的名字
 *   catBreed?: string — 新领养猫咪的品种
 */

import { CAT_PHOTOS } from '@/types/cat'
import { getCatPhotoUrl } from '@/utils/cat-photo'

interface IProps {
  isPerfect: boolean
  points: number
  catCount: number
  catPhotoKey?: string
  catName?: string
  catBreed?: string
}

const props = withDefaults(defineProps<IProps>(), {
  isPerfect: false,
  points: 0,
  catCount: 0,
  catPhotoKey: '',
  catName: '',
  catBreed: '',
})

let displayedPoints = $ref(0)
let showCat = $ref(false)
let showFireworks = $ref(false)
let animationDone = $ref(false)

const displayCatInfo = $computed(() => {
  if (props.catName && props.catBreed) {
    return { name: props.catName, breed: props.catBreed }
  }
  // Fallback: pick random
  const idx = Math.floor(Math.random() * CAT_PHOTOS.length)
  return { name: CAT_PHOTOS[idx].name, breed: CAT_PHOTOS[idx].breed }
})

// 积分滚动动画
function animatePoints(target: number) {
  displayedPoints = 0
  animationDone = false
  const duration = 800
  const steps = 20
  const increment = target / steps
  let current = 0

  const timer = setInterval(() => {
    current += increment
    if (current >= target) {
      displayedPoints = target
      clearInterval(timer)
      animationDone = true
    } else {
      displayedPoints = Math.floor(current)
    }
  }, duration / steps)
}

// 触发庆祝动画
function trigger() {
  showCat = false
  showFireworks = false
  animationDone = false

  // Timeline (per settlement-screen.md)
  setTimeout(() => { showFireworks = true }, 300)
  setTimeout(() => { animatePoints(props.points) }, 1500)
  setTimeout(() => { showCat = true }, 2300)
}

defineExpose({ trigger })
</script>

<template>
  <div class="cat-celebration">
    <!-- 烟花效果 -->
    <Transition name="firework">
      <div v-if="showFireworks" class="fireworks-zone">
        <span class="firework-particle" v-for="n in 8" :key="n"
              :style="{ '--angle': `${n * 45}deg`, '--delay': `${n * 0.05}s` }">🎆</span>
        <div class="perfect-banner">
          <span class="sparkle">✨</span>
          <span class="text">太棒了！全对！</span>
          <span class="sparkle">✨</span>
        </div>
      </div>
    </Transition>

    <!-- 积分获得 -->
    <div class="points-zone" v-if="points > 0">
      <div class="points-display" :class="{ 'done': animationDone }">
        <span class="points-icon">⭐</span>
        <span class="points-value">{{ displayedPoints }}</span>
        <span class="points-label">总积分</span>
      </div>
    </div>

    <!-- 猫咪领养 -->
    <Transition name="cat-entrance">
      <div v-if="showCat && isPerfect" class="cat-adoption-zone">
        <!-- 真实照片模式 -->
        <div v-if="catPhotoKey" class="cat-photo-card">
          <div class="photo-frame anim-cat-pulse">
            <img :src="getCatPhotoUrl(catPhotoKey)" :alt="displayCatInfo.name" />
          </div>
          <div class="cat-info">
            <h3>{{ displayCatInfo.name }}</h3>
            <p class="breed">{{ displayCatInfo.breed }}</p>
            <span class="unlock-badge">New!</span>
          </div>
        </div>

        <!-- Unlock notice when no cat is auto-adopted. -->
        <div v-else class="cat-emoji-card">
          <div class="cat-emoji-wrap anim-cat-entrance">
            <span class="cat-emoji cat-xl">🐱</span>
            <div class="pulse-ring"></div>
          </div>
          <div class="cat-info">
            <h3>新的猫咪领取资格已解锁！</h3>
            <p class="breed">前往领养中心，按顺序领取下一只猫咪</p>
            <span class="unlock-badge">已解锁</span>
          </div>
        </div>

        <div class="cat-count">
          目前拥有 <strong>{{ catCount }}</strong> 只猫咪 🐾
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.cat-celebration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  width: 100%;
}

// ===== 烟花 =====
.fireworks-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.perfect-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-cat-primary);
}

.sparkle {
  font-size: 1.2rem;
  animation: sparkle 1s ease-in-out infinite alternate;
}

@keyframes sparkle {
  from { transform: scale(1); }
  to   { transform: scale(1.3); }
}

// ===== 积分 =====
.points-zone {
  display: flex;
  justify-content: center;
}

.points-display {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  font-size: 1.2rem;
  color: var(--color-cat-encourage);
  transition: all 0.3s;

  &.done {
    opacity: 0.5;
    transform: translateY(-10px);
  }

  .points-icon {
    font-size: 1.5rem;
  }

  .points-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-cat-success);
    transition: transform 0.3s;
  }

  .points-label {
    font-size: 0.9rem;
    color: var(--color-sub-text);
  }
}

// ===== 猫咪领养卡片 =====
.cat-adoption-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.cat-photo-card,
.cat-emoji-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.photo-frame {
  width: 180px;
  height: 180px;
  border-radius: 16px;
  overflow: hidden;
  border: 3px solid var(--color-cat-primary);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.cat-emoji-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .pulse-ring {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 2px solid var(--color-cat-primary);
    animation: catPulseRing 1.5s ease-out infinite;
  }
}

@keyframes catPulseRing {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.cat-info {
  text-align: center;
  color: var(--color-cat-dark);

  h3 {
    font-size: 1.3rem;
    margin: 0 0 0.2rem;
  }

  .breed {
    font-size: 0.9rem;
    color: var(--color-sub-text);
    margin: 0 0 0.4rem;
  }
}

.unlock-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;

  background: var(--color-cat-success);
}

.cat-count {
  font-size: 0.9rem;
  color: var(--color-sub-text);

  strong {
    color: var(--color-cat-primary);
    font-size: 1.1rem;
  }
}

// ===== Transition =====
.firework-enter-active,
.firework-leave-active {
  transition: opacity 0.3s;
}
.firework-enter-from,
.firework-leave-to {
  opacity: 0;
}

.cat-entrance-enter-active {
  transition: all 0.6s ease-out;
}
.cat-entrance-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.cat-entrance-leave-active {
  transition: all 0.3s ease-in;
}
.cat-entrance-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
