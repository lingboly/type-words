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

const CatDetailDialog = defineAsyncComponent(() => import('@/components/CatDetailDialog.vue'))

const catStore = useCatStore()
let selectedCat = $ref<Cat | null>(null)
let showDetail = $ref(false)

onMounted(() => {
  catStore.loadFromStorage()
})

const cats = $computed(() => catStore.aliveCats)
const deceasedCats = $computed(() => catStore.cats.filter(c => c.status === 'deceased'))

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
</script>

<template>
  <div class="cat-room min-h-screen" :class="{ 'has-new-cat': catStore.newAdoptedCatId }">
    <!-- Header -->
    <header class="cat-room-header">
      <router-link to="/" class="back-btn" @click="goHome">
        ← 返回首页
      </router-link>
      <h1>🐾 知识猫咖</h1>
      <div class="header-stats">
        <span class="stat" v-if="catStore.catCount > 0">🐱 {{ catStore.catCount }} 只猫咪</span>
        <span class="stat">⭐ {{ catStore.points }} 积分</span>
      </div>
    </header>

    <!-- Warning Banner -->
    <div v-if="catStore.warningCatCount > 0" class="warning-banner">
      ⚠️ {{ catStore.warningCatCount }} 只猫咪需要照顾！
    </div>

    <!-- Empty State -->
    <div v-if="cats.length === 0" class="empty-state">
      <div class="empty-cat">🐱</div>
      <h2>还没有猫咪...</h2>
      <p>完成一组单词闯关，领养你的第一只猫！</p>
      <router-link to="/words" class="start-btn">开始学习</router-link>
    </div>

    <!-- Cat Grid -->
    <div v-else class="cat-grid">
      <CatCard
        v-for="cat in cats"
        :key="cat.id"
        :cat="cat"
        :photo-url="getPhotoUrl(cat.photoKey)"
        :breed="getBreed(cat.photoKey)"
        :is-new="cat.id === catStore.newAdoptedCatId"
        @click="openDetail(cat)"
      />
    </div>

    <!-- Deceased Cats -->
    <div v-if="deceasedCats.length > 0" class="deceased-section">
      <h3>🌈 曾经陪伴过你的猫咪 ({{ deceasedCats.length }})</h3>
      <p class="hint">完成全对练习可以领养新猫咪</p>
    </div>

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
  background: linear-gradient(180deg, var(--color-cat-cream, #FFF8F0) 0%, var(--color-cat-cream, #FFECD2) 100%);
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

.warning-banner {
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid #FF9800;
  border-radius: 12px;
  padding: 0.8rem 1.2rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #E65100;
  font-weight: 600;
  font-size: 0.95rem;
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

  .empty-state {
    min-height: 55vh;
  }
}
</style>
