<script setup lang="ts">
/**
 * CatDetailDialog — 猫咪详情弹窗
 * 展示猫咪信息 + 状态条 + 互动按钮（喂食/玩耍/抚摸）
 *
 * @see cat_study_english/design/gdd/cat-interaction.md
 */

import type { Cat } from '@/types/cat'
import { CAT_PHOTOS, CAT_FOOD_PRICE, CAT_TOY_PRICE } from '@/types/cat'
import { useCatStore } from '@/stores/cat.ts'
import BaseButton from '@/components/BaseButton.vue'

interface IProps {
  cat: Cat
}

const props = defineProps<IProps>()
const model = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  close: []
}>()

const catStore = useCatStore()

let showHeart = $ref(false)
let showPawPrint = $ref(false)
let feedResult = $ref<string | null>(null)
let playResult = $ref<string | null>(null)

function getPhotoUrl(photoKey: string): string {
  return new URL(`/src/assets/img/cat-photos/${photoKey}`, import.meta.url).href
}

function getBreed(photoKey: string): string {
  return CAT_PHOTOS.find(p => p.key === photoKey)?.breed ?? ''
}

function handleFeed() {
  const result = catStore.feedCat(props.cat.id)
  if (result.success) {
    feedResult = '喂食成功！饥饿值下降'
    showPawPrint = true
    setTimeout(() => { showPawPrint = false; feedResult = null }, 1500)
  } else {
    feedResult = result.reason ?? '喂食失败'
    setTimeout(() => { feedResult = null }, 2000)
  }
}

function handlePlay() {
  const result = catStore.playWithCat(props.cat.id)
  if (result.success) {
    playResult = '玩耍成功！亲昵度 +5'
    showHeart = true
    setTimeout(() => { showHeart = false; playResult = null }, 1500)
  } else {
    playResult = result.reason ?? '无法玩耍'
    setTimeout(() => { playResult = null }, 2000)
  }
}

function handlePet() {
  const result = catStore.petCat(props.cat.id)
  if (result.affectionGain > 0) {
    feedResult = '呼噜呼噜~ 亲昵度 +' + result.affectionGain
    showHeart = true
    setTimeout(() => { showHeart = false; feedResult = null }, 1500)
  } else {
    feedResult = '这只猫咪暂时无法互动'
    setTimeout(() => { feedResult = null }, 2000)
  }
}

function close() {
  emit('close')
}

const diedDate = $computed(() => {
  if (props.cat.status === 'deceased') {
    return new Date(props.cat.adoptedAt).toLocaleDateString('zh-CN')
  }
  return ''
})
</script>

<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click.self="close">
      <div class="dialog-content" :class="'status-' + cat.status">
        <!-- Header -->
        <div class="dialog-header">
          <h2>{{ cat.name }}</h2>
          <button class="close-btn" @click="close">✕</button>
        </div>

        <!-- Photo -->
        <div class="photo-section" @click="handlePet">
          <img
            :src="getPhotoUrl(cat.photoKey)"
            :alt="cat.name"
            class="detail-photo anim-cat-breathe"
            :class="{
              grayscale: cat.status === 'sick',
              'opacity-50': cat.status === 'deceased',
            }"
          />
          <!-- Interaction effects -->
          <Transition name="float-up">
            <div v-if="showHeart" class="float-effect heart">❤️</div>
          </Transition>
          <Transition name="float-up">
            <div v-if="showPawPrint" class="float-effect paw">🐾</div>
          </Transition>
        </div>

        <!-- Info -->
        <div class="cat-details">
          <p class="breed">{{ getBreed(cat.photoKey) }}</p>
          <p class="adopted-date">
            领养于 {{ new Date(cat.adoptedAt).toLocaleDateString('zh-CN') }}
          </p>
          <p v-if="cat.status === 'deceased'" class="died-text">🌈 {{ diedDate }} 离开了</p>

          <!-- Status bars -->
          <div class="status-bars" v-if="cat.status !== 'deceased'">
            <div class="bar-row">
              <span class="bar-label">❤️ 健康</span>
              <div class="bar-track">
                <div class="bar-fill health" :style="{ width: cat.health + '%' }" />
              </div>
              <span class="bar-value">{{ cat.health }}/100</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">🍖 饱腹</span>
              <div class="bar-track">
                <div class="bar-fill hunger" :style="{ width: (100 - cat.hunger) + '%' }" />
              </div>
              <span class="bar-value">{{ 100 - cat.hunger }}/100</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">💕 亲昵</span>
              <div class="bar-track">
                <div class="bar-fill affection" :style="{ width: cat.affection + '%' }" />
              </div>
              <span class="bar-value">{{ cat.affection }}/100</span>
            </div>
          </div>

          <!-- Feedback messages -->
          <div v-if="feedResult" class="feedback-msg">{{ feedResult }}</div>
          <div v-if="playResult" class="feedback-msg">{{ playResult }}</div>
        </div>

        <!-- Actions -->
        <div class="actions" v-if="cat.status !== 'deceased'">
          <BaseButton class="action-btn feed" @click="handleFeed">
            🥫 喂食 ({{ CAT_FOOD_PRICE }}分)
          </BaseButton>
          <BaseButton
            class="action-btn play"
            @click="handlePlay"
            :disabled="cat.status === 'sick'"
          >
            🧸 玩耍 ({{ CAT_TOY_PRICE }}分)
          </BaseButton>
        </div>
        <div v-else class="actions">
          <p class="deceased-hint">完成一组全对练习可以领养新猫咪</p>
        </div>

        <!-- Stats -->
        <div class="stats-summary">
          <span>喂食 {{ cat.feedCount }} 次</span>
          <span>·</span>
          <span>玩耍 {{ cat.playCount }} 次</span>
          <span>·</span>
          <span>当前积分 ⭐ {{ catStore.points }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.dialog-content {
  background: #fff;
  border-radius: 20px;
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);

  &.status-sick {
    border: 2px solid rgba(255, 152, 0, 0.3);
  }

  &.status-runaway {
    border: 2px solid rgba(158, 158, 158, 0.5);
  }

  &.status-deceased {
    opacity: 0.9;
    filter: grayscale(0.1);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem 0.5rem;

  h2 {
    font-size: 1.4rem;
    color: var(--color-cat-dark, #4E342E);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: #999;
    padding: 0.3rem;

    &:hover {
      color: #333;
    }
  }
}

.photo-section {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;

  .detail-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &.grayscale {
      filter: grayscale(0.4);
    }

    &.opacity-50 {
      opacity: 0.5;
    }
  }

  .float-effect {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 3rem;
    transform: translate(-50%, -50%);
    pointer-events: none;

    &.heart { animation: heartFloat 1s ease-out forwards; }
    &.paw { animation: heartFloat 1s ease-out forwards; }
  }
}

@keyframes heartFloat {
  0%   { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
  100% { opacity: 0; transform: translate(-50%, -120%) scale(1.2); }
}

.cat-details {
  padding: 1rem 1.5rem;

  .breed {
    font-size: 0.9rem;
    color: var(--color-sub-text, #8D6E63);
    margin: 0 0 4px;
  }

  .adopted-date {
    font-size: 0.8rem;
    color: #999;
    margin: 0 0 4px;
  }

  .died-text {
    color: #999;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .feedback-msg {
    margin-top: 0.8rem;
    padding: 0.5rem 0.8rem;
    background: rgba(92, 201, 167, 0.1);
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--color-cat-success, #5CC9A7);
    text-align: center;
  }
}

.status-bars {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .bar-label {
    width: 70px;
    font-size: 0.85rem;
    color: var(--color-cat-dark, #4E342E);
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      border-radius: 4px;
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
    font-size: 0.75rem;
    color: #999;
    width: 50px;
    text-align: right;
  }
}

.actions {
  padding: 0 1.5rem 1rem;
  display: flex;
  gap: 0.8rem;
  justify-content: center;

  .action-btn {
    flex: 1;
    font-weight: 600;
    border-radius: 10px;

    &.feed {
      background: #FF9800;
      color: white;
      border: none;

      &:hover {
        background: #F57C00;
      }
    }

    &.play {
      background: #AB47BC;
      color: white;
      border: none;

      &:hover {
        background: #8E24AA;
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
  }

  .deceased-hint {
    color: #999;
    font-size: 0.9rem;
    text-align: center;
  }
}

.stats-summary {
  padding: 0.8rem 1.5rem 1.2rem;
  text-align: center;
  font-size: 0.8rem;
  color: #bbb;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

// Float-up transition
.float-up-enter-active { animation: heartFloat 1s ease-out; }
.float-up-leave-active { transition: opacity 0.3s; }
.float-up-leave-to { opacity: 0; }
</style>
