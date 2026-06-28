<script setup lang="ts">
import {useBaseStore} from "@/stores/base.ts";
import BaseButton from "@/components/BaseButton.vue";
import {ShortcutKey, Statistics} from "@/types/types.ts";
import {emitter, EventKey, useEvents} from "@/utils/eventBus.ts";
import {useSettingStore} from "@/stores/setting.ts";
import {usePracticeStore} from "@/stores/practice.ts";
import {useCatStore} from "@/stores/cat.ts";
import { CAT_PHOTOS } from '@/types/cat'
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {defineAsyncComponent, nextTick, watch} from "vue";
import isoWeek from 'dayjs/plugin/isoWeek'
import CatCelebration from "@/components/CatCelebration.vue";

dayjs.extend(isoWeek)
dayjs.extend(isBetween);
const Dialog = defineAsyncComponent(() => import('@/components/dialog/Dialog.vue'))


const store = useBaseStore()
const settingStore = useSettingStore()
const statStore = usePracticeStore()
const catStore = useCatStore()
const model = defineModel({default: false})
let list = $ref([])
let dictIsEnd = $ref(false)
let celebrationRef = $ref<InstanceType<typeof CatCelebration> | null>(null)
let showCelebration = $ref(false)
let perfectAccuracy = $ref(false)
let totalEarnedPoints = $ref(0)
let newCatPhotoKey = $ref('')
let newCatName = $ref('')
let newCatBreed = $ref('')

function calcWeekList() {
  // 获取本周的起止时间
  const startOfWeek = dayjs().startOf('isoWeek'); // 周一
  const endOfWeek = dayjs().endOf('isoWeek');     // 周日
  // 初始化 7 天的数组，默认 false
  const weekList = Array(7).fill(false);

  store.sdict.statistics.forEach(item => {
    const date = dayjs(item.startDate);
    if (date.isBetween(startOfWeek, endOfWeek, null, '[]')) {
      let idx = date.day();
      // dayjs().day() 0=周日, 1=周一, ..., 6=周六
      // 需要转换为 0=周一, ..., 6=周日
      if (idx === 0) {
        idx = 6; // 周日放到最后
      } else {
        idx = idx - 1; // 其余前移一位
      }
      weekList[idx] = true;
    }
  });
  list = weekList;
}

// 监听 model 弹窗打开时重新计算
watch(model, async (newVal) => {
  if (newVal) {
    dictIsEnd = false;
    let data: Statistics = {
      spend: statStore.spend,
      startDate: statStore.startDate,
      total: statStore.total,
      wrong: statStore.wrong,
      new: statStore.newWordNumber,
      review: statStore.reviewWordNumber + statStore.writeWordNumber
    }
    window.umami?.track('endStudyWord', {
      name: store.sdict.name,
      spend: Number(statStore.spend / 1000 / 60).toFixed(1),
      index: store.sdict.lastLearnIndex,
      perDayStudyNumber: store.sdict.perDayStudyNumber,
      custom: store.sdict.custom,
      complete: store.sdict.complete,
      str: `name:${store.sdict.name},per:${store.sdict.perDayStudyNumber},spend:${Number(statStore.spend / 1000 / 60).toFixed(1)},index:${store.sdict.lastLearnIndex}`
    })
    store.sdict.lastLearnIndex = store.sdict.lastLearnIndex + statStore.newWordNumber
    if (store.sdict.lastLearnIndex >= store.sdict.length) {
      dictIsEnd = true;
      store.sdict.complete = true
      store.sdict.lastLearnIndex = 0
    }
    store.sdict.statistics.push(data as any)
    calcWeekList();

    // ===== Cat Café: 结算页庆祝动画 =====
    const accuracy = statStore.total > 0 ? (statStore.total - statStore.wrong) / statStore.total : 0
    perfectAccuracy = accuracy >= 1.0
    totalEarnedPoints = catStore.points

    await nextTick()
    if (perfectAccuracy) {
      showCelebration = true
      // Adopt a cat (handles random selection + persistence)
      const newCat = catStore.recordGameSession(accuracy, statStore.total - statStore.wrong, statStore.total)
      if (newCat) {
        newCatPhotoKey = newCat.photoKey
        newCatName = newCat.name
        newCatBreed = CAT_PHOTOS.find(p => p.key === newCat.photoKey)?.breed ?? ''
      }
      totalEarnedPoints = catStore.points
      celebrationRef?.trigger?.()
    }
  }
})

const close = () => model.value = false

useEvents([
  //特意注释掉，因为在练习界面用快捷键下一组时，需要判断是否在结算界面
  // [ShortcutKey.NextChapter, close],
  [ShortcutKey.RepeatChapter, close],
  [ShortcutKey.DictationChapter, close],
])

function options(emitType: string) {
  close()
  emitter.emit(EventKey[emitType])
}

</script>

<template>
  <Dialog
      :close-on-click-bg="false"
      :header="false"
      :keyboard="false"
      :show-close="false"
      v-model="model">
    <div class="w-140 bg-white  color-black p-6 relative flex flex-col gap-6">
      <!-- Cat Café: 全对庆祝动画 -->
      <div v-if="showCelebration" class="celebration-zone">
        <CatCelebration
          ref="celebrationRef"
          :is-perfect="perfectAccuracy"
          :points="totalEarnedPoints"
          :cat-count="catStore.catCount"
          :cat-photo-key="newCatPhotoKey"
          :cat-name="newCatName"
          :cat-breed="newCatBreed"
        />
      </div>

      <div class="w-full flex flex-col justify-evenly">
        <div class="center text-2xl mb-2">已完成今日任务</div>
        <div class="flex">
          <div class="flex-1 flex flex-col items-center">
            <div class="text-sm color-gray">新词数</div>
            <div class="text-4xl font-bold">{{ statStore.newWordNumber }}</div>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <div class="text-sm color-gray">复习数</div>
            <div class="text-4xl font-bold">{{ statStore.reviewWordNumber }}</div>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <div class="text-sm color-gray">默写数</div>
            <div class="text-4xl font-bold">{{ statStore.writeWordNumber }}</div>
          </div>
        </div>
      </div>

      <div class="text-xl text-center flex flex-col justify-around">
        <div>非常棒! 坚持了 <span class="color-emerald-500 font-bold text-2xl">
          {{ dayjs().diff(statStore.startDate, 'm') }}</span>分钟
        </div>
        <!-- Cat Café: 积分展示 -->
        <div v-if="catStore.points > 0" class="cat-points-summary mt-2">
          <span class="cat-icon">🐱</span>
          <span>当前积分: </span>
          <span class="points-value">{{ catStore.points }}</span>
          <span class="star">⭐</span>
          <span v-if="catStore.perfectGames > 0" class="perfect-badge">
            🎉 全对 {{ catStore.perfectGames }} 次
          </span>
        </div>
      </div>
      <div class="flex justify-center gap-10">
        <div class="flex justify-center items-center py-3 px-10 rounded-md color-red-500 flex-col"
             style="background: rgb(254,236,236)">
          <div class="text-3xl">{{ statStore.wrong }}</div>
          <div class="center gap-2">
            <IconFluentDismiss20Regular class="text-xl"/>
            错词
          </div>
        </div>
        <div class="flex justify-center items-center py-3 px-10 rounded-md color-emerald-500 flex-col"
             style="background: rgb(231,248,241)">
          <div class="text-3xl">{{ statStore.total - statStore.wrong }}</div>
          <div class="center gap-2">
            <IconFluentCheckmark20Regular class="text-xl"/>
            正确
          </div>
        </div>
      </div>

      <div class="center flex-col">
        <div class="title text-align-center mb-2">本周学习记录</div>
        <div class="flex gap-4 color-gray">
          <div
              class="w-8 h-8 rounded-md center"
              :class="item ? 'bg-emerald-500 color-white' : 'bg-gray-200'"
              v-for="(item, i) in list"
              :key="i"
          >{{ i + 1 }}
          </div>
        </div>
      </div>
      <div class="flex justify-center gap-4 ">
        <BaseButton
            :keyboard="settingStore.shortcutKeyMap[ShortcutKey.RepeatChapter]"
            @click="options(EventKey.repeatStudy)">
          重学一遍
        </BaseButton>
        <BaseButton
            :keyboard="settingStore.shortcutKeyMap[ShortcutKey.NextChapter]"
            @click="options(EventKey.continueStudy)">
          {{ dictIsEnd ? '重新练习' : '再来一组' }}
        </BaseButton>
        <BaseButton
            :keyboard="settingStore.shortcutKeyMap[ShortcutKey.NextRandomWrite]"
            @click="options(EventKey.randomWrite)">
            继续默写
        </BaseButton>
        <BaseButton @click="$router.back">
          返回主页
        </BaseButton>
        <!--        <BaseButton>-->
        <!--          分享-->
        <!--        </BaseButton>-->
      </div>
    </div>
  </Dialog>
</template>
<style scoped lang="scss">
// ===== Cat Café: 结算页样式 =====
.celebration-zone {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--color-cat-cream);
  border-radius: 16px;
  border: 2px solid var(--color-cat-primary);
}

.cat-points-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: var(--color-cat-dark);

  .cat-icon {
    font-size: 1.3rem;
    animation: catBreathe 3s ease-in-out infinite;
  }

  .points-value {
    font-size: 1.4rem;
    font-weight: bold;
    color: var(--color-cat-primary);
  }

  .star {
    font-size: 1.1rem;
    animation: sparkle 1.5s ease-in-out infinite;
  }

  .perfect-badge {
    display: inline-block;
    padding: 2px 10px;
    background: var(--color-cat-success);
    color: white;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: bold;
  }
}

@keyframes catBreathe {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.2); opacity: 0.8; }
}
</style>
