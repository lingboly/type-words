<script setup lang="ts">
/**
 * CatRoom — 知识猫咖房间页
 * 展示所有已领养猫咪，支持点击查看详情和互动
 *
 * @see cat_study_english/design/ux/cat-room.md
 * @see cat_study_english/design/ux/cat-scene.md
 */

import { onMounted, defineAsyncComponent } from 'vue'
import { useCatStore } from '@/stores/cat.ts'
import { CAT_PHOTOS, type Cat } from '@/types/cat'
import CatCard from '@/components/CatCard.vue'
import CatAvatar from '@/components/CatAvatar.vue'
import CatHud from '@/components/CatHud.vue'

const CatDetailDialog = defineAsyncComponent(() => import('@/components/CatDetailDialog.vue'))

const catStore = useCatStore()
let selectedCat = $ref<Cat | null>(null)
let showDetail = $ref(false)
type RoomSection = 'cats' | 'adopt' | 'care'
let activeSection = $ref<RoomSection>('cats')
let adoptionMessage = $ref('')

onMounted(async () => {
  await catStore.loadFromStorage()
  if (catStore.cats.length === 0) activeSection = 'adopt'
})

const cats = $computed(() => catStore.cafeCats)
const runawayCats = $computed(() => catStore.aliveCats.filter(cat => cat.status === 'runaway'))
const deceasedCats = $computed(() => catStore.cats.filter(c => c.status === 'deceased'))
const starterCats = CAT_PHOTOS.filter(photo => photo.rarity === 'common')
const careCats = $computed(() => [
  ...catStore.aliveCats.filter(cat => cat.status === 'icu' || cat.status === 'sick' || cat.status === 'runaway'),
  ...catStore.aliveCats.filter(cat => cat.status === 'healthy'),
])

function getPhotoUrl(photoKey: string): string {
  return new URL(`/src/assets/img/cat-photos/${photoKey}`, import.meta.url).href
}

function getBreed(photoKey: string): string {
  return CAT_PHOTOS.find(p => p.key === photoKey)?.breed ?? ''
}

function openDetail(cat: Cat) {
  selectedCat = cat
  showDetail = true
}

function closeDetail() {
  showDetail = false
  selectedCat = null
}

function goHome() {
  catStore.clearNewAdopted()
}

function adoptStarter(photoKey: string) {
  try {
    const result = catStore.adoptStarterCat(photoKey)
    adoptionMessage = result.success ? `欢迎 ${result.cat?.name} 加入猫咖！` : result.reason ?? '领养失败'
    if (result.cat) {
      activeSection = 'cats'
      openDetail(result.cat)
    }
  } catch {
    adoptionMessage = '领养没有完成，请刷新页面后重试'
  }
}

function careActionLabel(cat: Cat): string {
  if (cat.status === 'icu' || cat.status === 'sick') return '前往救治'
  if (cat.status === 'runaway') return '远程照护与召回'
  return '喂养、玩耍与抚摸'
}
</script>

<template>
  <div class="cat-room min-h-screen" :class="{ 'has-new-cat': catStore.newAdoptedCatId }">
    <!-- Header -->
    <header class="cat-room-header">
      <div class="brand-block">
        <CatAvatar size="medium" />
        <div>
          <router-link to="/" class="back-btn" @click="goHome">← 返回首页</router-link>
          <h1>知识猫咖</h1>
          <p>每只猫咪，都是认真学习留下的证明</p>
        </div>
      </div>
      <CatHud compact />
    </header>

    <section class="cafe-overview" aria-label="猫咖概览">
      <div class="overview-card">
        <span class="overview-icon">📚</span>
        <div><strong>{{ catStore.perfectGames }}</strong><span>累计全对</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon">✨</span>
        <div><strong>{{ catStore.perfectStreak }}/{{ catStore.tuning.communityHealStreak }}</strong><span>连续全对</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon">💚</span>
        <div><strong>{{ catStore.communityHealCount }}</strong><span>全体恢复</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon">💎</span>
        <div><strong>{{ catStore.rarityCounts.rare + catStore.rarityCounts.premium }}</strong><span>稀有收藏</span></div>
      </div>
    </section>

    <nav class="room-nav" aria-label="猫咪操作中心">
      <button type="button" :class="{ active: activeSection === 'cats' }" :aria-current="activeSection === 'cats' ? 'page' : undefined" @click="activeSection = 'cats'">
        <span>🐾</span><strong>我的猫咪</strong><small>查看状态与收藏</small>
      </button>
      <button type="button" :class="{ active: activeSection === 'adopt' }" :aria-current="activeSection === 'adopt' ? 'page' : undefined" @click="activeSection = 'adopt'">
        <span>🏠</span><strong>领养中心</strong><small>{{ catStore.cats.length ? '学习解锁新伙伴' : '选择第一只伙伴' }}</small>
      </button>
      <button type="button" :class="{ active: activeSection === 'care' }" :aria-current="activeSection === 'care' ? 'page' : undefined" @click="activeSection = 'care'">
        <span>🩺</span><strong>照护中心</strong><small>喂养、互动与救治</small>
      </button>
    </nav>

    <!-- Warning Banner -->
    <button v-if="catStore.warningCatCount > 0" type="button" class="warning-banner" @click="activeSection = 'care'">
      ⚠️ {{ catStore.warningCatCount }} 只猫咪需要照顾！
      <span>立即处理 →</span>
    </button>

    <main>
      <section v-show="activeSection === 'adopt'" class="adoption-center" aria-labelledby="adoption-title">
        <div class="section-intro">
          <span class="eyebrow">领养中心</span>
          <h2 id="adoption-title">{{ catStore.cats.length ? '学习解锁下一位猫咪伙伴' : '选择你的第一只猫咪伙伴' }}</h2>
          <p v-if="catStore.cats.length === 0">第一次领养免费。选定后，你可以马上抚摸它；继续学习赚积分来购买猫粮、玩具和药品。</p>
          <p v-else>每完成一组全对练习，就会随机领养一只猫咪。稀有伙伴会随着累计领养数量逐步解锁。</p>
        </div>

        <div v-if="catStore.cats.length === 0" class="starter-grid">
          <article v-for="photo in starterCats" :key="photo.key" class="starter-card">
            <img :src="getPhotoUrl(photo.key)" :alt="photo.name" />
            <div>
              <span class="starter-label">初始伙伴</span>
              <h3>{{ photo.name }}</h3>
              <p>{{ photo.breed }}</p>
              <button type="button" @click="adoptStarter(photo.key)">免费领养 {{ photo.name }}</button>
            </div>
          </article>
        </div>
        <div v-else class="earned-adoption">
          <div class="adoption-step"><span>1</span><strong>完成一组练习</strong><small>答完当前单词组</small></div>
          <div class="step-arrow">→</div>
          <div class="adoption-step"><span>2</span><strong>全部答对</strong><small>保持 100% 正确率</small></div>
          <div class="step-arrow">→</div>
          <div class="adoption-step"><span>3</span><strong>猫咪自动入住</strong><small>随机品种与稀有度</small></div>
          <router-link to="/words" class="start-btn">开始学习并领养</router-link>
        </div>
        <p v-if="adoptionMessage" class="adoption-message" role="status">{{ adoptionMessage }}</p>
      </section>

      <section v-show="activeSection === 'cats'" class="cats-section" aria-labelledby="cats-title">
        <div class="section-intro compact">
          <span class="eyebrow">我的猫咪</span>
          <h2 id="cats-title">猫咖伙伴 · {{ cats.length }} 只在店</h2>
          <p>点击任意猫咪即可抚摸、喂食、玩耍或使用医疗用品。</p>
        </div>

        <div v-if="cats.length === 0" class="empty-state">
          <CatAvatar size="large" />
          <h2>猫咖正在等待第一位伙伴</h2>
          <p>前往领养中心，免费选择你的第一只猫咪。</p>
          <button type="button" class="start-btn" @click="activeSection = 'adopt'">去领养猫咪</button>
        </div>

        <section v-if="runawayCats.length" class="runaway-station">
      <div>
        <span class="eyebrow">远程照护站</span>
        <h2>有 {{ runawayCats.length }} 只猫咪正在等你召回</h2>
        <p>每天远程喂食一次，连续 {{ catStore.tuning.runawayRecallDays }} 天就会回到猫咖。</p>
      </div>
      <button
        v-for="cat in runawayCats"
        :key="cat.id"
        type="button"
        class="runaway-cat"
        @click="openDetail(cat)"
      >
        <span>{{ cat.name }}</span>
        <strong>{{ cat.runawayFeedStreak || 0 }}/{{ catStore.tuning.runawayRecallDays }} 天</strong>
      </button>
        </section>

        <div v-if="cats.length" class="cat-grid">
      <CatCard
        v-for="cat in cats"
        :key="cat.id"
        :cat="cat"
        :photo-url="getPhotoUrl(cat.photoKey)"
        :breed="getBreed(cat.photoKey)"
          :daily-pet-limit="catStore.tuning.dailyPetLimit"
          :daily-play-limit="catStore.tuning.dailyPlayLimit"
        :is-new="cat.id === catStore.newAdoptedCatId"
        @click="openDetail(cat)"
      />
        </div>

        <div v-if="deceasedCats.length > 0" class="deceased-section">
      <h3>🌈 曾经陪伴过你的猫咪 ({{ deceasedCats.length }})</h3>
      <p class="hint">完成全对练习可以领养新猫咪</p>
        </div>
      </section>

      <section v-show="activeSection === 'care'" class="care-center" aria-labelledby="care-title">
        <div class="section-intro">
          <span class="eyebrow">照护中心</span>
          <h2 id="care-title">所有猫咪操作都在这里</h2>
          <p>选择猫咪后可进行抚摸、喂食、玩耍、普通救治、高级治疗和远程召回。付费操作会先显示确认信息。</p>
        </div>
        <div v-if="careCats.length" class="care-list">
          <button v-for="cat in careCats" :key="cat.id" type="button" class="care-row" :class="`care-${cat.status}`" @click="openDetail(cat)">
            <img :src="getPhotoUrl(cat.photoKey)" :alt="cat.name" />
            <span class="care-identity"><strong>{{ cat.name }}</strong><small>{{ getBreed(cat.photoKey) }}</small></span>
            <span class="care-vitals"><small>健康 {{ cat.health }}</small><small>饱腹 {{ 100 - cat.hunger }}</small><small>亲昵 {{ cat.affection }}</small></span>
            <span class="care-action">{{ careActionLabel(cat) }} →</span>
          </button>
        </div>
        <div v-else class="care-empty">
          <span>🩺</span>
          <h3>还没有需要照护的猫咪</h3>
          <button type="button" @click="activeSection = 'adopt'">先去领养一只</button>
        </div>
      </section>
    </main>

    <!-- Cat Detail Dialog -->
    <CatDetailDialog
      v-if="selectedCat"
      :cat="selectedCat"
      v-model="showDetail"
      @close="closeDetail"
    />
  </div>
</template>

<style scoped lang="scss">
.cat-room {
  background:
    radial-gradient(circle at 15% 20%, rgba(255, 183, 77, 0.2), transparent 24rem),
    linear-gradient(180deg, #fff8f0 0%, #f5e6d3 100%);
  padding: 1.5rem;
}

.cat-room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-cat-primary, #FF6B6B);

  h1 {
    font-size: 1.8rem;
    color: var(--color-cat-dark, #4E342E);
    margin: 0;
  }

  p {
    margin: 0.25rem 0 0;
    color: var(--color-cat-neutral);
  }

  .brand-block {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .back-btn {
    color: var(--color-cat-primary, #FF6B6B);
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;

    &:hover {
      text-decoration: underline;
    }
  }

  .header-stats {
    display: flex;
    gap: 1rem;

    .stat {
      font-size: 0.95rem;
      color: var(--color-cat-dark, #4E342E);
      font-weight: 600;
    }
  }
}

.cafe-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.room-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  button {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 0.7rem;
    padding: 0.85rem 1rem;
    border: 1px solid rgba(107, 123, 141, 0.2);
    border-radius: 14px;
    color: var(--color-cat-dark);
    background: rgba(255, 255, 255, 0.72);
    cursor: pointer;
    text-align: left;
    font: inherit;
    transition: transform 0.2s, border-color 0.2s, background 0.2s;

    > span { grid-row: 1 / 3; align-self: center; font-size: 1.45rem; }
    strong { font-size: 0.95rem; }
    small { color: var(--color-cat-neutral); font-size: 0.73rem; }
    &:hover { transform: translateY(-2px); border-color: var(--color-cat-primary); }
    &:focus-visible { outline: 3px solid var(--color-cat-success); outline-offset: 2px; }
    &.active { border-color: var(--color-cat-primary); background: #fff; box-shadow: 0 5px 16px rgba(93, 64, 55, 0.1); }
  }
}

main {
  min-height: 28rem;
}

.adoption-center, .cats-section, .care-center {
  padding: 1.35rem;
  border: 1px solid rgba(107, 123, 141, 0.16);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.58);
}

.section-intro {
  max-width: 48rem;
  margin-bottom: 1.2rem;

  &.compact { margin-bottom: 1rem; }
  .eyebrow { color: #b65f39; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  h2 { margin: 0.2rem 0 0.35rem; color: var(--color-cat-dark); font-size: 1.35rem; }
  p { margin: 0; color: var(--color-cat-neutral); line-height: 1.55; }
}

.starter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.starter-card {
  overflow: hidden;
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(93, 64, 55, 0.08);

  img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
  > div { padding: 0.9rem; }
  h3 { margin: 0.2rem 0; color: var(--color-cat-dark); }
  p { min-height: 2.4em; margin: 0 0 0.75rem; color: var(--color-cat-neutral); font-size: 0.76rem; }
  button {
    width: 100%;
    min-height: 2.6rem;
    border: 0;
    border-radius: 10px;
    color: #fff;
    background: var(--color-cat-primary);
    cursor: pointer;
    font-weight: 700;
  }
}

.starter-label {
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  color: #8a4b08;
  background: #fff1d6;
  font-size: 0.68rem;
  font-weight: 700;
}

.earned-adoption {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 14px;
  background: #fff;
}

.adoption-step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.1rem 0.55rem;
  flex: 1;

  > span { grid-row: 1 / 3; display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; color: #fff; background: var(--color-cat-primary); font-weight: 800; }
  strong { font-size: 0.86rem; }
  small { color: var(--color-cat-neutral); font-size: 0.72rem; }
}

.step-arrow { color: var(--color-cat-neutral); }
.adoption-message { color: var(--color-cat-success); font-weight: 700; }

.care-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.care-row {
  display: grid;
  grid-template-columns: 3.4rem minmax(9rem, 1fr) auto minmax(10rem, auto);
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  padding: 0.7rem;
  border: 1px solid rgba(107, 123, 141, 0.18);
  border-radius: 13px;
  background: #fff;
  color: var(--color-cat-dark);
  cursor: pointer;
  text-align: left;
  font: inherit;

  img { width: 3.4rem; height: 3.4rem; border-radius: 10px; object-fit: cover; }
  &:hover { border-color: var(--color-cat-primary); }
  &:focus-visible { outline: 3px solid var(--color-cat-success); outline-offset: 2px; }
  &.care-sick, &.care-icu { border-color: rgba(239, 83, 80, 0.42); background: #fff9f8; }
  &.care-runaway { border-color: rgba(255, 152, 0, 0.5); background: #fffbf2; }
}

.care-identity {
  display: flex;
  flex-direction: column;
  small { color: var(--color-cat-neutral); font-size: 0.72rem; }
}

.care-vitals {
  display: flex;
  gap: 0.7rem;
  color: var(--color-cat-neutral);
}

.care-action { color: var(--color-cat-primary); font-size: 0.82rem; font-weight: 700; text-align: right; }

.care-empty {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 16rem;
  text-align: center;

  > span { font-size: 2.5rem; }
  h3 { margin: 0; }
  button { padding: 0.65rem 1rem; border: 0; border-radius: 10px; color: #fff; background: var(--color-cat-primary); cursor: pointer; }
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(107, 123, 141, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);

  .overview-icon { font-size: 1.4rem; }
  div { display: flex; flex-direction: column; }
  strong { color: var(--color-cat-dark); font-size: 1.15rem; }
  span:last-child { color: var(--color-cat-neutral); font-size: 0.78rem; }
}

.runaway-station {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  border: 1px dashed var(--color-cat-encourage);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.64);

  h2 { margin: 0.2rem 0; font-size: 1.15rem; color: var(--color-cat-dark); }
  p { margin: 0; color: var(--color-cat-neutral); }
  .eyebrow { color: #b56a00; font-size: 0.75rem; font-weight: 800; }
}

.runaway-cat {
  display: flex;
  flex-direction: column;
  min-width: 8rem;
  min-height: 4rem;
  padding: 0.65rem 1rem;
  border: 0;
  border-radius: 12px;
  color: var(--color-cat-dark);
  background: #fff3e0;
  cursor: pointer;
  font: inherit;
}

.warning-banner {
  display: flex;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid #FF9800;
  border-radius: 12px;
  padding: 0.8rem 1.2rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #E65100;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;

  span { text-decoration: underline; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 1rem;

  .empty-cat {
    font-size: 5rem;
    opacity: 0.5;
  }

  h2 {
    font-size: 1.5rem;
    color: var(--color-cat-dark, #4E342E);
  }

  p {
    color: var(--color-sub-text, #8D6E63);
    font-size: 1rem;
  }

  .start-btn {
    display: inline-block;
    padding: 0.8rem 2rem;
    background: var(--color-cat-primary, #FF6B6B);
    color: white;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.1rem;
    transition: background 0.2s;
    border: 0;
    cursor: pointer;

    &:hover {
      background: #e55a5a;
    }
  }
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  padding: 0.5rem;
}

.deceased-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px dashed #ccc;
  text-align: center;

  h3 {
    font-size: 1.1rem;
    color: #999;
    margin-bottom: 0.5rem;
  }

  .hint {
    font-size: 0.85rem;
    color: #bbb;
  }
}

@media (max-width: 600px) {
  .cat-room {
    padding: 1rem;
  }

  .cat-room-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;

    h1 {
      font-size: 1.5rem;
    }

    .header-stats {
      flex-wrap: wrap;
    }
  }

  .cafe-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .room-nav {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .adoption-center, .cats-section, .care-center {
    padding: 1rem;
  }

  .starter-grid {
    grid-template-columns: 1fr;
  }

  .starter-card {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    img { height: 100%; aspect-ratio: auto; }
  }

  .earned-adoption {
    align-items: stretch;
    flex-direction: column;
  }

  .step-arrow { display: none; }

  .care-row {
    grid-template-columns: 3.4rem 1fr;
  }

  .care-vitals { grid-column: 1 / 3; justify-content: space-between; }
  .care-action { grid-column: 1 / 3; padding-top: 0.45rem; border-top: 1px solid #eee; text-align: left; }

  .brand-block {
    align-items: flex-start;
  }

  .empty-state {
    min-height: 55vh;
  }
}
</style>
