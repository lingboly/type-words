<script setup lang="ts">
import { ProjectName } from "@/config/env.ts";
import BaseButton from "@/components/BaseButton.vue";
import BaseIcon from "@/components/BaseIcon.vue";
import { defineAsyncComponent } from "vue";
import CatDecorator from "@/components/CatDecorator.vue";
import { useCatStore } from "@/stores/cat.ts";
import { onMounted } from "vue";

const Dialog = defineAsyncComponent(() => import('@/components/dialog/Dialog.vue'))
let showWechatDialog = $ref(false)
let showXhsDialog = $ref(false)

const catStore = useCatStore()

onMounted(() => {
  catStore.loadFromStorage()
})
</script>

<template>
  <div class="flex flex-col justify-between min-h-screen">
    <div class="center flex-col gap-8">
      <h1>{{ ProjectName }}</h1>
      <div class="text-center -mt-10">
        <h2>学习英语，一次敲击，一点进步</h2>
        <h2>记忆不再盲目，学习更高效，开源单词与文章练习工具</h2>
      </div>
      <div class="flex">
        <BaseButton size="large" @click="$router.push('/words')">单词练习</BaseButton>
        <BaseButton size="large" @click="$router.push('/articles')">文章练习</BaseButton>
      </div>

      <!-- Cat Café: 猫咖入口 -->
      <div v-if="catStore.catEnabled" class="cat-cafe-section">
        <div class="cat-cafe-header">
          <CatDecorator pose="happy" size="lg" />
          <h2>🐾 知识猫咖</h2>
          <p class="cat-cafe-subtitle">背单词赚积分，全对领猫咪，积分买猫粮养猫</p>
        </div>

        <!-- Warning: cats need care -->
        <div v-if="catStore.warningCatCount > 0" class="cat-warning">
          ⚠️ {{ catStore.warningCatCount }} 只猫咪需要照顾！
          <router-link to="/cat-room" class="warning-link">去看看</router-link>
        </div>

        <div v-if="catStore.runawayCatCount > 0" class="cat-runaway-warning">
          🏃 {{ catStore.runawayCatCount }} 只猫咪离家出走了...
        </div>

        <div class="cat-stats">
          <div class="stat-item">
            <span class="stat-icon">🐱</span>
            <span class="stat-value">{{ catStore.catCount }}</span>
            <span class="stat-label">已领养猫咪</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">⭐</span>
            <span class="stat-value">{{ catStore.points }}</span>
            <span class="stat-label">当前积分</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🎉</span>
            <span class="stat-value">{{ catStore.perfectGames }}</span>
            <span class="stat-label">全对次数</span>
          </div>
        </div>
        <BaseButton class="cat-cafe-btn" @click="$router.push('/cat-room')">
          去看看猫咪们
        </BaseButton>
      </div>

      <div class="feature-grid-wrap">
        <div class="feature-grid mb-5">
          <div class="card">
            <div class="emoji">📚</div>
            <div class="title">单词练习</div>
            <div class="desc">
              <ul>
                <li>三种输入模式：跟打 / 复习 / 默写</li>
                <li>智能模式：智能规划复习与默写</li>
                <li>自由模式：不受限制，自行规划</li>
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="emoji">✍️</div>
            <div class="title">文章练习</div>
            <div class="desc">
              <ul>
                <li>内置常见书籍，也可自行添加文章</li>
                <li>跟打 + 默写双模式，让背诵更高效</li>
                <li>支持边听边默写，强化记忆</li>
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="emoji">📕</div>
            <div class="title">收藏、错词本、已掌握</div>
            <div class="desc">
              <ul>
                <li>输入错误自动添加到错词本</li>
                <li>主动添加到已掌握，后续自动跳过</li>
                <li>主动添加到收藏中，以便巩固复习</li>
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="emoji">🌐</div>
            <div class="title">海量词库</div>
            <div class="desc">
              内置小学、初中、高中、四六级、考研、雅思、托福、GRE、GMAT、SAT、BEC、专四、专八等词库
            </div>
          </div>

        </div>
        <div class="feature-grid">
          <div class="card">
            <div class="emoji">🆓</div>
            <div class="title">免费开源</div>
            <div class="desc">
              <ul>
                <li>完全开源，可审查、可修改</li>
                <li>免费使用</li>
                <li>私有部署</li>
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="emoji">⚙️</div>
            <div class="title">高度自由</div>
            <div class="desc">
              <ul>
                <li>丰富的键盘音效</li>
                <li>可自定义快捷键</li>
                <li>高度定制化的设置选项</li>
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="emoji">🎨</div>
            <div class="title">简洁高效</div>
            <div class="desc">
              <ul>
                <li>简洁设计，现代化UI，无广告</li>
                <li>界面清爽，操作简单</li>
                <li>不强制关注任何平台</li>
              </ul>
            </div>
          </div>

          <div class="card">
            <div class="emoji">🎯</div>
            <div class="title">个性学习</div>
            <div class="desc">
              <ul>
                <li>自由添加词典与文章</li>
                <li>定制个性学习计划</li>
                <li>多种学习复习策略</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
<style scoped lang="scss">
h1 {
  font-size: 5rem;
  background: linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 2rem;
}

h2 {
  margin: 0;
}

h3:first-child {
  margin-top: 0;
}

.card {
  @apply flex flex-col items-start gap-2 mb-0;
  width: auto;

  .emoji {
    display: inline-block;
    background: var(--color-third);
    padding: .6rem;
    border-radius: 0.4rem;
    font-size: 1.5rem;
  }

  .title {
    font-weight: bold;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
  }
}

.feature-grid-wrap {
  width: min(60vw, 60rem);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space);
}

@media (max-width: 900px) {
  .center {
    padding-inline: 1rem;
  }

  h1 {
    font-size: clamp(3rem, 15vw, 5rem);
    text-align: center;
  }

  .feature-grid-wrap {
    width: 100%;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .cat-cafe-section {
    padding: 1.25rem;
  }

  .cat-stats {
    gap: 1rem;
  }
}

.bottom {
  width: 100%;
  padding-top: 2rem;
  border-top: 1px solid #c4c4c4;
}

// ===== Cat Café: 猫咖区域 =====
.cat-cafe-section {
  margin: 2rem 0;
  padding: 2rem;
  background: var(--color-cat-cream);
  border-radius: 16px;
  border: 2px solid var(--color-cat-primary);
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(255, 107, 107, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(92, 201, 167, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }

  .cat-cafe-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    z-index: 1;

    h2 {
      font-size: 1.8rem;
      color: var(--color-cat-dark);
      margin: 0;
    }

    .cat-cafe-subtitle {
      font-size: 0.95rem;
      color: var(--color-cat-neutral);
      margin: 0;
      font-style: italic;
    }
  }

  .cat-warning {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 152, 0, 0.15);
    border: 1px solid #FF9800;
    border-radius: 8px;
    color: #E65100;
    font-size: 0.9rem;
    font-weight: 600;
    position: relative;
    z-index: 1;

    .warning-link {
      color: var(--color-cat-primary);
      margin-left: 0.5rem;
      font-weight: 700;
    }
  }

  .cat-runaway-warning {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(158, 158, 158, 0.15);
    border: 1px solid #999;
    border-radius: 8px;
    color: #666;
    font-size: 0.85rem;
    position: relative;
    z-index: 1;
  }

  .cat-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 1.5rem 0;
    position: relative;
    z-index: 1;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;

      .stat-icon {
        font-size: 1.5rem;
      }

      .stat-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: var(--color-cat-primary);
      }

      .stat-label {
        font-size: 0.8rem;
        color: var(--color-sub-text);
      }
    }
  }

  .cat-cafe-btn {
    background: var(--color-cat-primary);
    color: white;
    border: none;
    font-weight: bold;
    position: relative;
    z-index: 1;

    &:hover {
      background: #e55a5a;
    }
  }
}

a {
  color: unset;
}
</style>
