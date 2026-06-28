<script setup lang="ts">

import { inject, watch } from "vue"
import { usePracticeStore } from "@/stores/practice.ts";
import { useSettingStore } from "@/stores/setting.ts";
import { ShortcutKey, PracticeData } from "@/types/types.ts";
import BaseIcon from "@/components/BaseIcon.vue";
import Tooltip from "@/components/base/Tooltip.vue";
import Progress from '@/components/base/Progress.vue'
import CatDecorator from "@/components/CatDecorator.vue";

const statisticsStore = usePracticeStore()
const settingStore = useSettingStore()

defineProps<{
  showEdit?: boolean,
  isCollect: boolean,
  isSimple: boolean
}>()

const emit = defineEmits<{
  toggleCollect: [],
  toggleSimple: [],
  edit: [],
  skip: [],
}>()

let practiceData = inject<PracticeData>('practiceData')

function format(val: number, suffix: string = '', check: number = -1) {
  return val === check ? '-' : (val + suffix)
}

const status = $computed(() => {
  let str = '正在'
  switch (statisticsStore.step) {
    case 0:
      str += `学习新词`
      break
    case 1:
      str += `默写新词`
      break
    case 2:
      str += `复习上次`
      break
    case 3:
      str += `默写上次`
      break
    case 4:
      str += '默写之前'
      break
  }
  return str
})

const progress = $computed(() => {
  if (!practiceData.words.length) return 0
  return ((practiceData.index / practiceData.words.length) * 100)
})

// ===== Cat Café: 猫咪表情随进度变化 =====
const catMood = $computed(() => {
  const p = progress
  if (p < 20) return 'sleeping' as const
  if (p < 50) return 'curious' as const
  if (p < 80) return 'idle' as const
  return 'happy' as const
})

</script>

<template>
  <div class="footer">
    <Tooltip :title="settingStore.showToolbar?'收起':'展开'">
      <IconFluentChevronLeft20Filled
          @click="settingStore.showToolbar = !settingStore.showToolbar"
          class="arrow"
          :class="!settingStore.showToolbar && 'down'"
          color="#999"/>
    </Tooltip>

    <div class="bottom">
      <!-- Cat Café: 进度条使用猫主题色 -->
      <div class="progress-wrapper">
        <Progress
            :percentage="progress"
            :stroke-width="8"
            :show-text="false"
            class="cat-progress"/>
      </div>

      <!-- Cat Café: 猫咪表情随进度变化 -->
      <div class="cat-mood-bar">
        <CatDecorator :pose="catMood" size="sm" :show-animation="true" />
        <span class="mood-text">{{ progress.toFixed(0) }}%</span>
      </div>

      <div class="flex justify-between items-center">
        <div class="stat">
          <div class="row">
            <div class="num">{{ `${practiceData.index}/${practiceData.words.length}` }}</div>
            <div class="line"></div>
            <div class="name">{{ status }}</div>
          </div>
          <div class="row">
            <div class="num">{{ statisticsStore.total }}</div>
            <div class="line"></div>
            <div class="name">单词总数</div>
          </div>
          <div class="row">
            <div class="num">{{ format(statisticsStore.inputWordNumber, '', 0) }}</div>
            <div class="line"></div>
            <div class="name">总输入数</div>
          </div>
          <div class="row">
            <div class="num">{{ format(statisticsStore.wrong, '', 0) }}</div>
            <div class="line"></div>
            <div class="name">总错误数</div>
          </div>
        </div>
        <div class="flex  gap-2  justify-center items-center">
          <BaseIcon
              :class="!isSimple?'collect':'fill'"
              @click="$emit('toggleSimple')"
              :title="(!isSimple ? '标记为已掌握' : '取消标记已掌握')+`(${settingStore.shortcutKeyMap[ShortcutKey.ToggleSimple]})`">
            <IconFluentCheckmarkCircle16Regular v-if="!isSimple"/>
            <IconFluentCheckmarkCircle16Filled v-else/>
          </BaseIcon>

          <BaseIcon
              :class="!isCollect?'collect':'fill'"
              @click.stop="$emit('toggleCollect')"
              :title="(!isCollect ? '收藏' : '取消收藏')+`(${settingStore.shortcutKeyMap[ShortcutKey.ToggleCollect]})`">
            <IconFluentStarAdd16Regular v-if="!isCollect"/>
            <IconFluentStar16Filled v-else/>
          </BaseIcon>
          <BaseIcon
              @click="emit('skip')"
              :title="`跳过(${settingStore.shortcutKeyMap[ShortcutKey.Next]})`">
            <IconFluentArrowBounce20Regular class="transform-rotate-180"/>
          </BaseIcon>

          <BaseIcon
              @click="settingStore.dictation = !settingStore.dictation"
              :title="`开关默写模式(${settingStore.shortcutKeyMap[ShortcutKey.ToggleDictation]})`"
          >
            <IconFluentEyeOff16Regular v-if="settingStore.dictation"/>
            <IconFluentEye16Regular v-else/>
          </BaseIcon>

          <BaseIcon
              :title="`开关释义显示(${settingStore.shortcutKeyMap[ShortcutKey.ToggleShowTranslate]})`"
              @click="settingStore.translate = !settingStore.translate">
            <IconFluentTranslate16Regular v-if="settingStore.translate"/>
            <IconFluentTranslateOff16Regular v-else/>
          </BaseIcon>

          <BaseIcon
              @click="settingStore.showPanel = !settingStore.showPanel"
              :title="`单词本(${settingStore.shortcutKeyMap[ShortcutKey.TogglePanel]})`">
            <IconFluentTextListAbcUppercaseLtr20Regular/>
          </BaseIcon>
        </div>
      </div>
    </div>
    <div class="progress-wrap">
      <Progress :percentage="progress"
                :stroke-width="8"
                :show-text="false"/>
    </div>
  </div>
</template>

<style scoped lang="scss">


.footer {
  flex-shrink: 0;
  width: var(--toolbar-width);
  position: relative;

  &.hide {
    margin-bottom: -6rem;
    margin-top: 3rem;

    .progress-wrap {

      bottom: calc(100% + 1.8rem);
    }
  }

  .bottom {
    position: relative;
    width: 100%;
    box-sizing: border-box;
    border-radius: .6rem;
    background: var(--color-second);
    padding: .2rem var(--space) .4rem var(--space);
    z-index: 2;
    border: 1px solid var(--color-item-border);
    box-shadow: var(--shadow);

    // ===== Cat Café: 进度条样式 =====
    .progress-wrapper {
      margin-bottom: 0.5rem;
    }

    .cat-progress :deep(.progress-bar-inner) {
      background: linear-gradient(90deg, var(--color-cat-success), var(--color-cat-primary));
      border-radius: 4px;
    }

    // ===== Cat Café: 猫咪表情栏 =====
    .cat-mood-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      padding: 0.3rem;
      background: var(--color-cat-cream);
      border-radius: 8px;

      .mood-text {
        font-size: 0.8rem;
        color: var(--color-cat-dark);
        font-weight: bold;
      }
    }

    .stat {
      margin-top: .5rem;
      display: flex;
      justify-content: space-around;
      gap: var(--stat-gap);

      .row {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: .3rem;
        width: 6rem;
        color: gray;

        .line {
          height: 1px;
          width: 100%;
          background: var(--color-sub-gray);
        }
      }
    }
  }

  .progress-wrap {
    width: var(--toolbar-width);
    transition: all .3s;
    padding: 0 .6rem;
    box-sizing: border-box;
    position: fixed;
    bottom: 1rem;
  }

  .arrow {
    position: absolute;
    top: -40%;
    left: 50%;
    cursor: pointer;
    transition: all .5s;
    transform: rotate(-90deg);
    padding: .5rem;
    font-size: 1.2rem;

    &.down {
      top: -90%;
      transform: rotate(90deg);
    }
  }
}
</style>
