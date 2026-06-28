<script setup lang="ts">
/**
 * CatDetailDialog — 猫咪详情弹窗
 * 展示猫咪信息 + 状态条 + 互动按钮（喂食/玩耍/抚摸）
 *
 * @see cat_study_english/design/gdd/cat-interaction.md
 */

import type { Cat, CatSupplyTier } from '@/types/cat'
import {
  CAT_FOOD_PRICE,
  CAT_MEDICINE_PRICE,
  CAT_PHOTOS,
  CAT_RARITY_LABELS,
  CAT_TOY_PRICE,
  LUXURY_CAT_TOY_PRICE,
  MAX_DAILY_PLAYS,
  MAX_DAILY_PET_POINTS,
  PREMIUM_CAT_FOOD_PRICE,
  PREMIUM_CAT_MEDICINE_PRICE,
  RUNAWAY_RECALL_DAYS,
} from '@/types/cat'
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
type PurchaseKind = 'feed' | 'play' | 'heal'
let pendingPurchase = $ref<{
  kind: PurchaseKind
  tier: CatSupplyTier
  price: number
  label: string
} | null>(null)

function getPhotoUrl(photoKey: string): string {
  return new URL(`/src/assets/img/cat-photos/${photoKey}`, import.meta.url).href
}

function getBreed(photoKey: string): string {
  return CAT_PHOTOS.find(p => p.key === photoKey)?.breed ?? ''
}

function showFeedback(message: string, effect: 'heart' | 'paw' | 'none' = 'none') {
  feedResult = message
  showHeart = effect === 'heart'
  showPawPrint = effect === 'paw'
  setTimeout(() => {
    showHeart = false
    showPawPrint = false
    feedResult = null
  }, 1800)
}

function requestPurchase(kind: PurchaseKind, tier: CatSupplyTier, price: number, label: string) {
  pendingPurchase = { kind, tier, price, label }
}

function confirmPurchase() {
  if (!pendingPurchase) return
  const { kind, tier } = pendingPurchase
  pendingPurchase = null
  if (kind === 'feed') return handleFeed(tier)
  if (kind === 'play') return handlePlay(tier)
  return handleHeal(tier)
}

function handleFeed(tier: CatSupplyTier) {
  const result = catStore.feedCat(props.cat.id, tier)
  if (result.success) {
    showFeedback(result.recalled ? '欢迎回家！亲昵度恢复到 50' : props.cat.status === 'runaway' ? `远程照护成功，已坚持 ${props.cat.runawayFeedStreak || 0}/${RUNAWAY_RECALL_DAYS} 天` : '喂食成功，饱腹和亲昵都变好了', 'paw')
  } else {
    showFeedback(result.reason ?? '喂食失败')
  }
}

function handlePlay(tier: CatSupplyTier) {
  const result = catStore.playWithCat(props.cat.id, tier)
  if (result.success) {
    showFeedback(`玩得真开心！亲昵 +${result.affectionGain}，健康 +${result.healthGain}`, 'heart')
  } else {
    showFeedback(result.reason ?? '无法玩耍')
  }
}

function handleHeal(tier: CatSupplyTier) {
  const result = catStore.healCat(props.cat.id, tier)
  showFeedback(result.success ? `治疗完成，健康 +${result.healthGain}` : result.reason ?? '治疗失败', result.success ? 'heart' : 'none')
}

function handlePet() {
  const result = catStore.petCat(props.cat.id)
  if (result.affectionGain > 0) {
    feedResult = '呼噜呼噜~ 亲昵度 +' + result.affectionGain
    showHeart = true
    setTimeout(() => { showHeart = false; feedResult = null }, 1500)
  } else {
    showFeedback(result.reason ?? '这只猫咪暂时无法互动')
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
          <div>
            <span class="rarity-pill" :class="`rarity-${cat.rarity || 'common'}`">{{ CAT_RARITY_LABELS[cat.rarity || 'common'] }}</span>
            <h2>{{ cat.name }}</h2>
          </div>
          <button class="close-btn" aria-label="关闭猫咪详情" @click="close">✕</button>
        </div>

        <!-- Photo -->
        <button type="button" class="photo-section" :disabled="cat.status === 'deceased' || cat.status === 'runaway'" aria-label="抚摸猫咪" @click="handlePet">
          <img
            :src="getPhotoUrl(cat.photoKey)"
            :alt="cat.name"
            class="detail-photo anim-cat-breathe"
            :class="{
              grayscale: cat.status === 'sick' || cat.status === 'icu',
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
        </button>

        <!-- Info -->
        <div class="cat-details">
          <p class="breed">{{ getBreed(cat.photoKey) }}</p>
          <p class="adopted-date">
            领养于 {{ new Date(cat.adoptedAt).toLocaleDateString('zh-CN') }}
          </p>
          <p v-if="cat.status === 'deceased'" class="died-text">🌈 {{ diedDate }} 离开了</p>
          <p v-if="cat.status === 'icu'" class="care-alert">🏥 正在 ICU 抢救，每天需要 {{ 15 }} 积分维持治疗</p>
          <p v-if="cat.status === 'runaway'" class="care-alert">🏡 远程照护 {{ cat.runawayFeedStreak || 0 }}/{{ RUNAWAY_RECALL_DAYS }} 天，连续照护可召回</p>

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
          <div class="daily-summary" v-if="cat.status !== 'deceased'">
            今日抚摸 {{ cat.dailyPetPoints || 0 }}/{{ MAX_DAILY_PET_POINTS }} · 玩耍 {{ cat.dailyPlayCount || 0 }}/{{ MAX_DAILY_PLAYS }}
          </div>
        </div>

        <!-- Actions -->
        <div class="care-shop" v-if="cat.status !== 'deceased'">
          <h3>{{ cat.status === 'runaway' ? '远程照护' : '今日照护' }}</h3>
          <p>积分全部来自学习。消费前会再次确认。</p>
          <div class="supply-grid">
          <BaseButton class="action-btn feed" @click="requestPurchase('feed', 'basic', CAT_FOOD_PRICE, '基础猫粮')">
            🥫 基础猫粮 <small>{{ CAT_FOOD_PRICE }}分</small>
          </BaseButton>
          <BaseButton
            class="action-btn play"
            @click="requestPurchase('feed', 'premium', PREMIUM_CAT_FOOD_PRICE, '高级猫粮')"
            :disabled="cat.status === 'icu'"
          >
            🍣 高级猫粮 <small>{{ PREMIUM_CAT_FOOD_PRICE }}分</small>
          </BaseButton>
          <BaseButton class="action-btn play" :disabled="cat.status !== 'healthy'" @click="requestPurchase('play', 'basic', CAT_TOY_PRICE, '普通玩具')">
            🧶 普通玩具 <small>{{ CAT_TOY_PRICE }}分</small>
          </BaseButton>
          <BaseButton class="action-btn play" :disabled="cat.status !== 'healthy'" @click="requestPurchase('play', 'premium', LUXURY_CAT_TOY_PRICE, '豪华玩具')">
            🧸 豪华玩具 <small>{{ LUXURY_CAT_TOY_PRICE }}分</small>
          </BaseButton>
          <BaseButton class="action-btn heal" :disabled="cat.status !== 'sick' && cat.status !== 'icu'" @click="requestPurchase('heal', 'basic', CAT_MEDICINE_PRICE, '普通药品')">
            💊 普通药品 <small>{{ CAT_MEDICINE_PRICE }}分</small>
          </BaseButton>
          <BaseButton class="action-btn heal" :disabled="cat.status !== 'sick' && cat.status !== 'icu'" @click="requestPurchase('heal', 'premium', PREMIUM_CAT_MEDICINE_PRICE, '高级治疗')">
            🏥 高级治疗 <small>{{ PREMIUM_CAT_MEDICINE_PRICE }}分</small>
          </BaseButton>
          </div>

          <div class="purchase-confirm" v-if="pendingPurchase" role="alert">
            <span>确认花费 {{ pendingPurchase.price }} 积分购买{{ pendingPurchase.label }}？</span>
            <div>
              <button type="button" @click="pendingPurchase = null">取消</button>
              <button type="button" class="confirm" @click="confirmPurchase">确认消费</button>
            </div>
          </div>
        </div>
        <div v-else class="care-shop">
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

  &.status-icu {
    border: 2px solid rgba(239, 83, 80, 0.55);
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

  .rarity-pill {
    display: inline-block;
    margin-bottom: 0.2rem;
    padding: 2px 8px;
    border-radius: 999px;
    color: #fff;
    background: var(--color-cat-neutral);
    font-size: 0.68rem;
    font-weight: 800;

    &.rarity-rare { background: var(--color-cat-premium); }
    &.rarity-premium { background: linear-gradient(135deg, #9b88cc, #ffb347); }
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
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;

  &:focus-visible {
    outline: 4px solid var(--color-cat-success);
    outline-offset: -4px;
  }

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

  .care-alert {
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    color: #8a4b00;
    background: #fff3e0;
    font-size: 0.82rem;
  }
}

.daily-summary {
  margin-top: 0.7rem;
  color: var(--color-cat-neutral);
  font-size: 0.78rem;
  text-align: center;
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

.care-shop {
  padding: 0 1.5rem 1rem;

  h3 { margin: 0 0 0.2rem; color: var(--color-cat-dark); font-size: 1rem; }
  > p { margin: 0 0 0.75rem; color: var(--color-cat-neutral); font-size: 0.75rem; }
}

.supply-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;

  .action-btn {
    width: 100%;
    min-height: 48px;
    white-space: normal;

    small { display: block; margin-left: 0.3rem; opacity: 0.8; }
  }

  :deep(.action-btn.feed) { background: #c96916; }
  :deep(.action-btn.play) { background: #7552a8; }
  :deep(.action-btn.heal) { background: #287560; }
}

.purchase-confirm {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-cat-encourage);
  border-radius: 10px;
  color: var(--color-cat-dark);
  background: #fff8f0;
  font-size: 0.82rem;

  > div { display: flex; justify-content: flex-end; gap: 0.5rem; }

  button {
    min-height: 40px;
    padding: 0 0.8rem;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
  }

  .confirm { color: #fff; background: var(--color-cat-primary); }
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

@media (max-width: 520px) {
  .dialog-overlay { padding: 0.75rem; }

  .photo-section {
    aspect-ratio: 16 / 10;

    .detail-photo { object-position: 50% 34%; }
  }

  .cat-details { padding: 0.8rem 1.25rem; }
  .care-shop { padding-inline: 1.25rem; }
}
</style>
