<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useSettingStore } from "@/stores/setting.ts";
import { getAudioFileUrl, usePlayAudio } from "@/hooks/sound.ts";
import { getShortcutKey, useEventListener } from "@/hooks/event.ts";
import { checkAndUpgradeSaveDict, checkAndUpgradeSaveSetting, cloneDeep, loadJsLib, shakeCommonDict } from "@/utils";
import { DefaultShortcutKeyMap, ShortcutKey } from "@/types/types.ts";
import BaseButton from "@/components/BaseButton.vue";
import VolumeIcon from "@/components/icon/VolumeIcon.vue";
import { useBaseStore } from "@/stores/base.ts";
import { saveAs } from "file-saver";
import {
  APP_NAME, APP_VERSION,
  EXPORT_DATA_KEY,
  LOCAL_FILE_KEY,
  PracticeSaveArticleKey,
  PracticeSaveWordKey, SAVE_DICT_KEY, SAVE_SETTING_KEY, SoundFileOptions
} from "@/config/env.ts";
import dayjs from "dayjs";
import BasePage from "@/components/BasePage.vue";
import Toast from '@/components/base/toast/Toast.ts'
import { Option, Select } from "@/components/base/select";
import Switch from "@/components/base/Switch.vue";
import Slider from "@/components/base/Slider.vue";
import RadioGroup from "@/components/base/radio/RadioGroup.vue";
import Radio from "@/components/base/radio/Radio.vue";
import InputNumber from "@/components/base/InputNumber.vue";
import PopConfirm from "@/components/PopConfirm.vue";
import Textarea from "@/components/base/Textarea.vue";
import SettingItem from "@/pages/setting/SettingItem.vue";
import { get, set } from "idb-keyval";
import { useRuntimeStore } from "@/stores/runtime.ts";
import CatDecorator from "@/components/CatDecorator.vue";
import { useCatStore } from "@/stores/cat.ts";
import { onMounted } from "vue";
import type { CatTuning } from '@/types/cat'

const emit = defineEmits<{
  toggleDisabledDialogEscKey: [val: boolean]
}>()

const tabIndex = $ref(0)
const settingStore = useSettingStore()
const runtimeStore = useRuntimeStore()
const store = useBaseStore()
const catStore = useCatStore()

// ===== Cat Café: 猫咪设置本地状态 =====
let catEnabled = $ref(catStore.catEnabled)
let showPracticeCompanion = $ref(catStore.showPracticeCompanion)
let showAnimations = $ref(catStore.showAnimations)
// ===== Cat Café: 家长密码门控 =====
let showPasswordGate = $ref(true)  // 默认要求密码
let passwordInput = $ref('')
let passwordError = $ref('')
let passwordAttempts = $ref(0)
let passwordLocked = $ref(false)
let passwordLockTimer = $ref<ReturnType<typeof setTimeout> | null>(null)
let currentPassword = $ref('')
let nextPassword = $ref('')
let confirmPassword = $ref('')
let testPoints = $ref(catStore.points)
const MAX_PASSWORD_ATTEMPTS = 5
const PASSWORD_LOCK_DURATION = 30000  // 30秒锁定

const tuningGroups: Array<{ title: string; description: string; fields: Array<{ key: keyof CatTuning; label: string; unit: string; min: number; max: number; step?: number }> }> = [
  {
    title: '状态与安全线',
    description: '控制离线衰减、生病和离家出走的触发节奏。设置为 0 可关闭对应衰减。',
    fields: [
      { key: 'hungerDecayPerHour', label: '饥饿衰减', unit: '/小时', min: 0, max: 50 },
      { key: 'affectionDecayPerHour', label: '亲昵衰减', unit: '/小时', min: 0, max: 5 },
      { key: 'healthDrainThreshold', label: '健康衰减触发线', unit: '饥饿', min: 30, max: 80 },
      { key: 'sickHealthThreshold', label: '生病健康线', unit: '健康', min: 1, max: 80 },
      { key: 'runawayAffectionThreshold', label: '离家亲昵线', unit: '亲昵', min: 0, max: 100 },
      { key: 'runawayMaxProbability', label: '最高离家概率', unit: '%', min: 0, max: 100 },
    ],
  },
  {
    title: '照护规则',
    description: '控制 ICU、召回、全员恢复和每日互动上限。',
    fields: [
      { key: 'icuDailyCost', label: 'ICU 每日费用', unit: '分', min: 0, max: 100 },
      { key: 'icuFailedDaysLimit', label: 'ICU 欠费宽限', unit: '天', min: 1, max: 30 },
      { key: 'runawayRecallDays', label: '召回连续照护', unit: '天', min: 1, max: 30 },
      { key: 'communityHealStreak', label: '普天同庆阈值', unit: '次全对', min: 2, max: 15 },
      { key: 'dailyPetLimit', label: '每日抚摸增益上限', unit: '点', min: 1, max: 100 },
      { key: 'dailyPlayLimit', label: '每日玩耍上限', unit: '次', min: 1, max: 20 },
    ],
  },
  {
    title: '领养规则',
    description: '全对达到要求后解锁下一只猫；领取价从基础价格开始逐只翻倍。',
    fields: [
      { key: 'adoptionPerfectRequirement', label: '每只猫解锁所需全对', unit: '次', min: 1, max: 20 },
      { key: 'adoptionBasePrice', label: '第一只猫领取价格', unit: '分', min: 0, max: 100000 },
    ],
  },
  {
    title: '猫咪商店价格',
    description: '价格即时生效。过低价格可能让积分失去激励作用。',
    fields: [
      { key: 'basicFoodPrice', label: '基础猫粮', unit: '分', min: 0, max: 100 },
      { key: 'premiumFoodPrice', label: '高级猫粮', unit: '分', min: 0, max: 200 },
      { key: 'basicToyPrice', label: '普通玩具', unit: '分', min: 0, max: 200 },
      { key: 'luxuryToyPrice', label: '豪华玩具', unit: '分', min: 0, max: 500 },
      { key: 'medicinePrice', label: '普通药品', unit: '分', min: 0, max: 200 },
      { key: 'premiumMedicinePrice', label: '高级治疗', unit: '分', min: 0, max: 500 },
    ],
  },
]

async function checkPassword() {
  if (passwordLocked) return
  if (await catStore.verifyParentPassword(passwordInput)) {
    showPasswordGate = false
    passwordError = ''
    passwordAttempts = 0
    passwordInput = ''
  } else {
    passwordAttempts++
    passwordError = `密码错误！剩余尝试次数: ${MAX_PASSWORD_ATTEMPTS - passwordAttempts}`
    passwordInput = ''
    if (passwordAttempts >= MAX_PASSWORD_ATTEMPTS) {
      passwordLocked = true
      passwordError = '尝试次数过多，已锁定 30 秒'
      passwordLockTimer = setTimeout(() => {
        passwordLocked = false
        passwordAttempts = 0
        passwordError = ''
        passwordLockTimer = null
      }, PASSWORD_LOCK_DURATION)
    }
  }
}

async function changePassword() {
  if (!/^\d{4,8}$/.test(nextPassword)) return Toast.warning('新密码需要 4–8 位数字')
  if (nextPassword !== confirmPassword) return Toast.warning('两次输入的新密码不一致')
  if (!await catStore.changeParentPassword(currentPassword, nextPassword)) return Toast.error('当前密码不正确')
  currentPassword = ''
  nextPassword = ''
  confirmPassword = ''
  Toast.success('家长密码已更新')
}

function updateTuning(key: keyof CatTuning, event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (!Number.isFinite(value)) return
  catStore.updateTuning(key, value)
}

function toggleTestMode(enabled: boolean) {
  catStore.setTestMode(enabled)
  testPoints = catStore.points
}

function applyTestPoints() {
  if (catStore.setTestPoints(testPoints)) {
    testPoints = catStore.points
    Toast.success(`测试积分已设为 ${catStore.points}`)
  }
}

// 应用设置：从本地状态同步到 store
function applyCatSettings() {
  catStore.catEnabled = catEnabled
  catStore.showPracticeCompanion = showPracticeCompanion
  catStore.showAnimations = showAnimations
  catStore.persist()
}

// 监听本地开关变化，自动同步
watch(() => catEnabled, () => applyCatSettings())
watch(() => showPracticeCompanion, () => applyCatSettings())
watch(() => showAnimations, () => applyCatSettings())

// 回到猫咪设置标签时重新加载本地状态
watch(() => tabIndex, async (newVal) => {
  if (newVal === 7) {
    await catStore.loadFromStorage()
    catEnabled = catStore.catEnabled
    showPracticeCompanion = catStore.showPracticeCompanion
    showAnimations = catStore.showAnimations
    testPoints = catStore.points
    showPasswordGate = true
    passwordInput = ''
    passwordError = ''
  }
})

onMounted(async () => {
  await catStore.loadFromStorage()
  catEnabled = catStore.catEnabled
  showPracticeCompanion = catStore.showPracticeCompanion
  showAnimations = catStore.showAnimations
  testPoints = catStore.points
})
//@ts-ignore
const gitLastCommitHash = ref(LATEST_COMMIT_HASH);
const simpleWords = $computed({
  get: () => store.simpleWords.join(','),
  set: v => {
    try {
      store.simpleWords = v.split(',');
    } catch (e) {

    }
  }
})

let editShortcutKey = $ref('')

const disabledDefaultKeyboardEvent = $computed(() => {
  return editShortcutKey && tabIndex === 3
})

watch(() => disabledDefaultKeyboardEvent, v => {
  emit('toggleDisabledDialogEscKey', !!v)
})

// 监听编辑快捷键状态变化，自动聚焦输入框
watch(() => editShortcutKey, (newVal) => {
  if (newVal) {
    // 使用nextTick确保DOM已更新
    nextTick(() => {
      focusShortcutInput()
    })
  }
})

useEventListener('keydown', (e: KeyboardEvent) => {
  if (!disabledDefaultKeyboardEvent) return

  // 确保阻止浏览器默认行为
  e.preventDefault()
  e.stopPropagation()

  let shortcutKey = getShortcutKey(e)
  // console.log('e', e, e.keyCode, e.ctrlKey, e.altKey, e.shiftKey)
  // console.log('key', shortcutKey)

  // if (shortcutKey[shortcutKey.length-1] === '+') {
  //   settingStore.shortcutKeyMap[editShortcutKey] = DefaultShortcutKeyMap[editShortcutKey]
  //   return ElMessage.warning('设备失败！')
  // }

  if (editShortcutKey) {
    if (shortcutKey === 'Delete') {
      settingStore.shortcutKeyMap[editShortcutKey] = ''
    } else {
      // 忽略单独的修饰键
      if (shortcutKey === 'Ctrl+' || shortcutKey === 'Alt+' || shortcutKey === 'Shift+' ||
        e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') {
        return;
      }

      for (const [k, v] of Object.entries(settingStore.shortcutKeyMap)) {
        if (v === shortcutKey && k !== editShortcutKey) {
          settingStore.shortcutKeyMap[editShortcutKey] = DefaultShortcutKeyMap[editShortcutKey]
          return Toast.warning('快捷键重复！')
        }
      }
      settingStore.shortcutKeyMap[editShortcutKey] = shortcutKey
    }
  }
})

function handleInputBlur() {
  // 输入框失焦时结束编辑状态
  editShortcutKey = ''
}

function handleBodyClick() {
  if (editShortcutKey) {
    editShortcutKey = ''
  }
}

function focusShortcutInput() {
  // 找到当前正在编辑的快捷键输入框
  const inputElements = document.querySelectorAll('.set-key input')
  if (inputElements && inputElements.length > 0) {
    // 聚焦第一个找到的输入框
    const inputElement = inputElements[0] as HTMLInputElement
    inputElement.focus()
  }
}

// 快捷键中文名称映射
function getShortcutKeyName(key: string): string {
  const shortcutKeyNameMap = {
    'ShowWord': '显示单词',
    'EditArticle': '编辑文章',
    'Next': '下一个',
    'Previous': '上一个',
    'ToggleSimple': '切换已掌握状态',
    'ToggleCollect': '切换收藏状态',
    'NextChapter': '下一组',
    'PreviousChapter': '上一组',
    'RepeatChapter': '重复本组',
    'DictationChapter': '默写本组',
    'PlayWordPronunciation': '播放发音',
    'ToggleShowTranslate': '切换显示翻译',
    'ToggleDictation': '切换默写模式',
    'ToggleTheme': '切换主题',
    'ToggleConciseMode': '切换简洁模式',
    'TogglePanel': '切换面板',
    'RandomWrite': '随机默写',
    'NextRandomWrite': '继续随机默写'
  }

  return shortcutKeyNameMap[key] || key
}

function resetShortcutKeyMap() {
  editShortcutKey = ''
  settingStore.shortcutKeyMap = cloneDeep(DefaultShortcutKeyMap)
  Toast.success('恢复成功')
}

let exportLoading = $ref(false)
let importLoading = $ref(false)

async function exportData(notice = '导出成功！') {
  exportLoading = true
  const JSZip = await loadJsLib('JSZip', `jszip.min.js`);
  let data = {
    version: EXPORT_DATA_KEY.version,
    val: {
      setting: {
        version: SAVE_SETTING_KEY.version,
        val: settingStore.$state
      },
      dict: {
        version: SAVE_DICT_KEY.version,
        val: shakeCommonDict(store.$state)
      },
      [PracticeSaveWordKey.key]: {
        version: PracticeSaveWordKey.version,
        val: {}
      },
      [PracticeSaveArticleKey.key]: {
        version: PracticeSaveArticleKey.version,
        val: {}
      },
      [APP_VERSION.key]: -1
    }
  }
  let d = localStorage.getItem(PracticeSaveWordKey.key)
  if (d) {
    try {
      data.val[PracticeSaveWordKey.key] = JSON.parse(d)
    } catch (e) {
    }
  }
  let d1 = localStorage.getItem(PracticeSaveArticleKey.key)
  if (d1) {
    try {
      data.val[PracticeSaveArticleKey.key] = JSON.parse(d1)
    } catch (e) {
    }
  }
  let r = await get(APP_VERSION.key)
  data.val[APP_VERSION.key] = r

  const zip = new JSZip();
  zip.file("data.json", JSON.stringify(data));

  const mp3 = zip.folder("mp3");
  const allRecords = await get(LOCAL_FILE_KEY);
  for (const rec of allRecords ?? []) {
    mp3.file(rec.id + ".mp3", rec.file);
  }
  exportLoading = false
  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(content, `${APP_NAME}-User-Data-${dayjs().format('YYYY-MM-DD HH-mm-ss')}.zip`);
  });
  Toast.success(notice)
}

function importJson(str: string, notice: boolean = true) {
  let obj = {
    version: -1,
    val: {
      setting: {},
      dict: {},
      [PracticeSaveWordKey.key]: {},
      [PracticeSaveArticleKey.key]: {},
      [APP_VERSION.key]: {},
    }
  }
  try {
    obj = JSON.parse(str)
    let data = obj.val
    let settingState = checkAndUpgradeSaveSetting(data.setting)
    settingState.load = true
    settingStore.setState(settingState)
    let baseState = checkAndUpgradeSaveDict(data.dict)
    baseState.load = true
    store.setState(baseState)
    if (obj.version >= 3) {
      try {
        let save: any = obj.val[PracticeSaveWordKey.key] || {}
        if (save.val && Object.keys(save.val).length > 0) {
          localStorage.setItem(PracticeSaveWordKey.key, JSON.stringify(obj.val[PracticeSaveWordKey.key]))
        }
      } catch (e) {
        //todo 上报
      }
    }
    if (obj.version >= 4) {
      try {
        let save: any = obj.val[PracticeSaveArticleKey.key] || {}
        if (save.val && Object.keys(save.val).length > 0) {
          localStorage.setItem(PracticeSaveArticleKey.key, JSON.stringify(obj.val[PracticeSaveArticleKey.key]))
        }
      } catch (e) {
        //todo 上报
      }
      try {
        let r: any = obj.val[APP_VERSION.key] || -1
        set(APP_VERSION.key, r)
        runtimeStore.isNew = r ? (APP_VERSION.version > Number(r)) : true
      } catch (e) {
        //todo 上报
      }
    }
    notice && Toast.success('导入成功！')
  } catch (err) {
    return Toast.error('导入失败！')
  }
}

async function importData(e) {
  let file = e.target.files[0]
  if (!file) return
  if (file.name.endsWith(".json")) {
    let reader = new FileReader();
    reader.onload = function (v) {
      let str: any = v.target.result;
      if (str) {
        importJson(str)
      }
    }
    reader.readAsText(file);
  } else if (file.name.endsWith(".zip")) {
    try {
      importLoading = true
      const JSZip = await loadJsLib('JSZip', `jszip.min.js`);
      const zip = await JSZip.loadAsync(file);

      const dataFile = zip.file("data.json");
      if (!dataFile) {
        return Toast.error("缺少 data.json，导入失败");
      }

      const mp3Folder = zip.folder("mp3");
      if (mp3Folder) {
        const records: { id: string; file: Blob }[] = [];
        for (const filename in zip.files) {
          if (filename.startsWith("mp3/") && filename.endsWith(".mp3")) {
            const entry = zip.file(filename);
            if (!entry) continue;
            const blob = await entry.async("blob");
            const id = filename.replace(/^mp3\//, "").replace(/\.mp3$/, "");
            records.push({ id, file: blob });
          }
        }
        await set(LOCAL_FILE_KEY, records);
      }

      const str = await dataFile.async("string");
      importJson(str, false)

      Toast.success("导入成功！");
    } catch (e) {
      Toast.error("导入失败！");
    } finally {
      importLoading = false
    }
  } else {
    Toast.error("不支持的文件类型");
  }
}

function importOldData() {
  exportData('已为您自动保存当前数据！稍后将进行老数据导入操作')
  setTimeout(() => {
    let oldDataStr = localStorage.getItem('type-word-dict-v3')
    if (oldDataStr) {
      try {
        let obj = JSON.parse(oldDataStr)
        let data = {
          version: 3,
          val: obj
        }
        let baseState = checkAndUpgradeSaveDict(data)
        store.setState(baseState)
        Toast.success('导入成功')
      } catch (err) {
        Toast.error('导入失败')
      }
    } else {
      Toast.error('导入失败！原因：本地无老数据备份')
    }
  }, 1000)
}
</script>

<template>
  <BasePage>
    <div class="setting text-md">
      <div class="left mt-10">
        <div class="tabs">
          <div class="tab" :class="tabIndex === 0 && 'active'" @click="tabIndex = 0">
            <IconFluentSettings20Regular width="20" />
            <span>通用练习设置</span>
          </div>
          <div class="tab" :class="tabIndex === 1 && 'active'" @click="tabIndex = 1">
            <IconFluentTextUnderlineDouble20Regular width="20" />
            <span>单词练习设置</span>
          </div>
          <div class="tab" :class="tabIndex === 2 && 'active'" @click="tabIndex = 2">
            <IconFluentBookLetter20Regular width="20" />
            <span>文章练习设置</span>
          </div>
          <div class="tab" :class="tabIndex === 3 && 'active'" @click="tabIndex = 3">
            <IconFluentKeyboardLayoutFloat20Regular width="20" />
            <span>快捷键设置</span>
          </div>
          <div class="tab" :class="tabIndex === 4 && 'active'" @click="tabIndex = 4">
            <IconFluentDatabasePerson20Regular width="20" />
            <span>数据管理</span>
          </div>
          <div class="tab" :class="tabIndex === 5 && 'active'" @click="() => {
            tabIndex = 5
            runtimeStore.isNew = false
            set(APP_VERSION.key, APP_VERSION.version)
          }">
            <IconFluentTextBulletListSquare20Regular width="20" />
            <span>更新日志</span>
            <div class="red-point" v-if="runtimeStore.isNew"></div>
          </div>
          <div class="tab" :class="tabIndex === 6 && 'active'" @click="tabIndex = 6">
            <IconFluentPerson20Regular width="20" />
            <span>关于</span>
          </div>
          <div class="tab" :class="tabIndex === 7 && 'active'" @click="tabIndex = 7">
            🐱
            <span>猫咪设置</span>
          </div>
        </div>
      </div>
      <div class="content">
        <div class="page-title text-align-center">设置</div>
        <!--        通用练习设置-->
        <!--        通用练习设置-->
        <!--        通用练习设置-->
        <div v-if="tabIndex === 0">
          <SettingItem title="忽略大小写" desc="开启后，输入时不区分大小写，如输入“hello”和“Hello”都会被认为是正确的">
            <Switch v-model="settingStore.ignoreCase" />
          </SettingItem>

          <SettingItem title="允许默写模式下显示提示"
            :desc="`开启后，可以通过将鼠标移动到单词上或者按快捷键 ${settingStore.shortcutKeyMap[ShortcutKey.ShowWord]} 显示正确答案`">
            <Switch v-model="settingStore.allowWordTip" />
          </SettingItem>

          <div class="line"></div>
          <SettingItem title="简单词过滤" desc="开启后，练习的单词中不会包含简单词；文章统计的总词数中不会包含简单词">
            <Switch v-model="settingStore.ignoreSimpleWord" />
          </SettingItem>

          <SettingItem title="简单词列表" class="items-start!" v-if="settingStore.ignoreSimpleWord">
            <Textarea placeholder="多个单词用英文逗号隔号" v-model="simpleWords" :autosize="{ minRows: 6, maxRows: 10 }" />
          </SettingItem>

          <!--          音效-->
          <!--          音效-->
          <!--          音效-->
          <div class="line"></div>
          <SettingItem main-title="音效" />
          <SettingItem title="单词/句子发音口音">
            <Select v-model="settingStore.soundType" placeholder="请选择" class="w-50!">
              <Option label="美音" value="us" />
              <Option label="英音" value="uk" />
            </Select>
          </SettingItem>

          <div class="line"></div>
          <SettingItem title="按键音">
            <Switch v-model="settingStore.keyboardSound" />
          </SettingItem>
          <SettingItem title="按键音效">
            <Select v-model="settingStore.keyboardSoundFile" placeholder="请选择" class="w-50!">
              <Option v-for="item in SoundFileOptions" :key="item.value" :label="item.label" :value="item.value">
                <div class="flex justify-between items-center w-full">
                  <span>{{ item.label }}</span>
                  <VolumeIcon :time="100" @click="usePlayAudio(getAudioFileUrl(item.value)[0])" />
                </div>
              </Option>
            </Select>
          </SettingItem>
          <SettingItem title="音量">
            <Slider v-model="settingStore.keyboardSoundVolume" />
            <span class="w-10 pl-5">{{ settingStore.keyboardSoundVolume }}%</span>
          </SettingItem>

          <div class="line"></div>
          <SettingItem title="效果音（输入错误、完成时的音效）">
            <Switch v-model="settingStore.effectSound" />
          </SettingItem>
          <SettingItem title="音量">
            <Slider v-model="settingStore.effectSoundVolume" />
            <span class="w-10 pl-5">{{ settingStore.effectSoundVolume }}%</span>
          </SettingItem>
        </div>


        <!--        单词练习设置-->
        <!--        单词练习设置-->
        <!--        单词练习设置-->
        <div v-if="tabIndex === 1">
          <SettingItem title="练习模式">
            <RadioGroup v-model="settingStore.wordPracticeMode" class="flex-col gap-0!">
              <Radio :value="0" label="智能模式，系统自动计算复习单词与默写单词" />
              <Radio :value="1" label="自由模式，系统不强制复习与默写" />
            </RadioGroup>
          </SettingItem>

          <SettingItem title="显示上一个/下一个单词" desc="开启后，练习中会在上方显示上一个/下一个单词">
            <Switch v-model="settingStore.showNearWord" />
          </SettingItem>

          <SettingItem title="不默认显示练习设置弹框" desc="在词典详情页面，点击学习按钮后，是否显示练习设置弹框">
            <Switch v-model="settingStore.disableShowPracticeSettingDialog" />
          </SettingItem>

          <SettingItem title="输入错误时，清空已输入内容">
            <Switch v-model="settingStore.inputWrongClear" />
          </SettingItem>

          <SettingItem title="单词循环设置" class="gap-0!">
            <RadioGroup v-model="settingStore.repeatCount">
              <Radio :value="1" size="default">1</Radio>
              <Radio :value="2" size="default">2</Radio>
              <Radio :value="3" size="default">3</Radio>
              <Radio :value="5" size="default">5</Radio>
              <Radio :value="100" size="default">自定义</Radio>
            </RadioGroup>
            <div class="ml-2 center gap-space" v-if="settingStore.repeatCount === 100">
              <span>循环次数</span>
              <InputNumber v-model="settingStore.repeatCustomCount" :min="6" :max="15" type="number" />
            </div>
          </SettingItem>


          <!--          发音-->
          <!--          发音-->
          <!--          发音-->
          <div class="line"></div>
          <SettingItem mainTitle="音效" />
          <SettingItem title="自动发音">
            <Switch v-model="settingStore.wordSound" />
          </SettingItem>
          <SettingItem title="音量">
            <Slider v-model="settingStore.wordSoundVolume" />
            <span class="w-10 pl-5">{{ settingStore.wordSoundVolume }}%</span>
          </SettingItem>
          <SettingItem title="倍速">
            <Slider v-model="settingStore.wordSoundSpeed" :step="0.1" :min="0.5" :max="3" />
            <span class="w-10 pl-5">{{ settingStore.wordSoundSpeed }}</span>
          </SettingItem>


          <!--          自动切换-->
          <!--          自动切换-->
          <!--          自动切换-->
          <div class="line"></div>
          <SettingItem mainTitle="自动切换" />
          <SettingItem title="自动切换下一个单词" desc="未开启自动切换时，当输入完成后请使用空格键切换下一个">
            <Switch v-model="settingStore.autoNextWord" />
          </SettingItem>

          <SettingItem title="自动切换下一个单词时间" desc="正确输入单词后，自动跳转下一个单词的时间">
            <InputNumber v-model="settingStore.waitTimeForChangeWord" :disabled="!settingStore.autoNextWord" :min="0"
              :max="10000" :step="100" type="number" />
            <span class="ml-4">毫秒</span>
          </SettingItem>


          <!--          字体设置-->
          <!--          字体设置-->
          <!--          字体设置-->
          <div class="line"></div>
          <SettingItem mainTitle="字体设置" />
          <SettingItem title="外语字体">
            <Slider :min="10" :max="100" v-model="settingStore.fontSize.wordForeignFontSize" />
            <span class="w-10 pl-5">{{ settingStore.fontSize.wordForeignFontSize }}px</span>
          </SettingItem>
          <SettingItem title="中文字体">
            <Slider :min="10" :max="100" v-model="settingStore.fontSize.wordTranslateFontSize" />
            <span class="w-10 pl-5">{{ settingStore.fontSize.wordTranslateFontSize }}px</span>
          </SettingItem>
        </div>


        <!--        文章练习设置-->
        <!--        文章练习设置-->
        <!--        文章练习设置-->
        <div v-if="tabIndex === 2">
          <!--          发音-->
          <!--          发音-->
          <!--          发音-->
          <div class="line"></div>
          <SettingItem mainTitle="音效" />
          <SettingItem title="自动播放句子">
            <Switch v-model="settingStore.articleSound" />
          </SettingItem>
          <SettingItem title="自动播放下一篇">
            <Switch v-model="settingStore.articleAutoPlayNext" />
          </SettingItem>
          <SettingItem title="音量">
            <Slider v-model="settingStore.articleSoundVolume" />
            <span class="w-10 pl-5">{{ settingStore.articleSoundVolume }}%</span>
          </SettingItem>
          <SettingItem title="倍速">
            <Slider v-model="settingStore.articleSoundSpeed" :step="0.1" :min="0.5" :max="3" />
            <span class="w-10 pl-5">{{ settingStore.articleSoundSpeed }}</span>
          </SettingItem>
        </div>


        <div class="body" v-if="tabIndex === 3">
          <div class="row">
            <label class="main-title">功能</label>
            <div class="wrapper">快捷键(点击可修改)</div>
          </div>
          <div class="scroll">
            <div class="row" v-for="item of Object.entries(settingStore.shortcutKeyMap)">
              <label class="item-title">{{ getShortcutKeyName(item[0]) }}</label>
              <div class="wrapper" @click="editShortcutKey = item[0]">
                <div class="set-key" v-if="editShortcutKey === item[0]">
                  <input ref="shortcutInput" :value="item[1] ? item[1] : '未设置快捷键'" readonly type="text"
                    @blur="handleInputBlur">
                  <span @click.stop="editShortcutKey = ''">按键盘进行设置，<span class="text-red!">设置完成点击这里</span></span>
                </div>
                <div v-else>
                  <div v-if="item[1]">{{ item[1] }}</div>
                  <span v-else>未设置快捷键</span>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <label class="item-title"></label>
            <div class="wrapper">
              <BaseButton @click="resetShortcutKeyMap">恢复默认</BaseButton>
            </div>
          </div>
        </div>

        <div v-if="tabIndex === 4">
          <div>
            目前用户的所有数据
            <b class="text-red">仅保存在本地</b>。如果您需要在不同的设备、浏览器或者其他非官方部署上使用 {{ APP_NAME }}，
            您需要手动进行数据同步和保存。
          </div>
          <BaseButton :loading="exportLoading" class="mt-3" @click="exportData()">导出数据</BaseButton>

          <div class="line my-3"></div>

          <div>请注意，导入数据后将<b class="text-red"> 完全覆盖 </b>当前所有数据，请谨慎操作。
          </div>
          <div class="flex gap-space mt-3">
            <div class="import hvr-grow">
              <BaseButton :loading="importLoading">导入数据</BaseButton>
              <input type="file" accept="application/json,.zip,application/zip" @change="importData">
            </div>
            <PopConfirm title="导入老版本数据前，请先备份当前数据，确定要导入老版本数据吗？" @confirm="importOldData">
              <BaseButton>老版本数据导入</BaseButton>
            </PopConfirm>
          </div>
        </div>

        <div v-if="tabIndex === 5">
          <div class="item p-2">
            <!-- <div class="mb-2">
              <div>
                <span>2025/9/14：</span>
                <span>完善文章编辑、导入、导出等功能</span>
              </div>
              <div class="text-base mt-1">
                <div>1、文章的音频管理功能，目前已可添加音频、设置句子与音频的对应位置</div>
                <div>2、文章可导入、导出</div>
                <div>3、单词可导入、导出</div>
              </div>
            </div> -->
            <div class="line"></div>
          </div>
        </div>

        <div v-if="tabIndex === 6" class="center flex-col">
          <!-- Cat Café: 猫咪装饰 -->
          <div class="mb-4">
            <CatDecorator pose="happy" size="lg" />
          </div>
          <h1>Type Words</h1>
          <p class=" text-xl">
            基于 https://github.com/zyronon/TypeWords 修改,删了一些收集隐私数据内容
          </p>
          <p>
            GitHub地址：<a href="https://github.com/pingnas/type-words"
              target="_blank">https://github.com/pingnas/type-words</a>
          </p>

          <div class="text-md color-gray mt-10">
            Build {{ gitLastCommitHash }}
          </div>
        </div>

        <!-- Cat Café: 猫咪设置 -->
        <div v-if="tabIndex === 7">
          <!-- 家长密码门控 -->
          <div v-if="showPasswordGate" class="password-gate">
            <div class="password-card">
              <div class="password-icon">🔐</div>
              <h3>家长控制面板</h3>
              <p class="password-desc">请输入密码以访问猫咪设置</p>
              <div class="password-input-wrap">
                <input
                  v-model="passwordInput"
                  type="password"
                  inputmode="numeric"
                  maxlength="8"
                  placeholder="输入4–8位数字密码"
                  class="password-input"
                  :disabled="passwordLocked"
                  @keyup.enter="checkPassword"
                />
                <BaseButton class="password-btn" @click="checkPassword" :disabled="passwordLocked">
                  确认
                </BaseButton>
              </div>
              <div v-if="passwordError" class="password-error">{{ passwordError }}</div>
              <p class="password-hint">初始密码: 1234（解锁后请及时修改）</p>
            </div>
          </div>

          <!-- 猫咪设置（密码解锁后可见） -->
          <div v-else>
            <div class="password-unlocked-bar">
              ✅ 已解锁 —
              <span class="relock-link" @click="showPasswordGate = true">重新锁定</span>
            </div>

            <SettingItem title="启用猫咖功能" desc="关闭后，所有猫咪元素将不显示，应用恢复为原始模式">
              <Switch v-model="catEnabled" />
            </SettingItem>

            <SettingItem title="练习页猫咪陪伴" desc="在练习页面角落显示猫咪装饰和积分反馈">
              <Switch v-model="showPracticeCompanion" />
            </SettingItem>

            <SettingItem title="猫咪动画" desc="开启动画效果（呼吸、尾巴摇摆、眨眼等）。关掉可减少视觉干扰">
              <Switch v-model="showAnimations" />
            </SettingItem>

            <div class="line"></div>

            <section class="parent-section" aria-labelledby="cat-tuning-title">
              <div class="section-heading">
                <div>
                  <h3 id="cat-tuning-title">猫咪参数</h3>
                  <p>依据猫咖设计文档开放的家长调节项，修改后即时保存并用于下一次计算。</p>
                </div>
                <button type="button" class="text-action" @click="catStore.resetTuning()">恢复默认</button>
              </div>
              <div v-if="catStore.tuning.hungerDecayPerHour === 0 && catStore.tuning.affectionDecayPerHour === 0" class="setting-notice">
                猫咪的饥饿与亲昵将保持不变。
              </div>
              <div v-for="group in tuningGroups" :key="group.title" class="tuning-group">
                <h4>{{ group.title }}</h4>
                <p>{{ group.description }}</p>
                <div class="tuning-grid">
                  <label v-for="field in group.fields" :key="field.key" class="tuning-field">
                    <span>{{ field.label }}</span>
                    <span class="number-control">
                      <input
                        type="number"
                        :value="catStore.tuning[field.key]"
                        :min="field.min"
                        :max="field.max"
                        :step="field.step || 1"
                        :aria-label="field.label"
                        @change="updateTuning(field.key, $event)"
                      />
                      <small>{{ field.unit }}</small>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section class="parent-section test-mode-section" aria-labelledby="test-mode-title">
              <div class="section-heading">
                <div>
                  <h3 id="test-mode-title">测试模式</h3>
                  <p>仅供家长验证猫咪购买和状态流程。关闭后保留最后设置的积分。</p>
                </div>
                <Switch :model-value="catStore.testMode" @update:model-value="toggleTestMode" />
              </div>
              <div v-if="catStore.testMode" class="test-controls">
                <span class="test-badge">TEST</span>
                <label>
                  当前测试积分
                  <input v-model.number="testPoints" type="number" min="0" max="1000000" aria-label="当前测试积分" />
                </label>
                <BaseButton @click="applyTestPoints">应用积分</BaseButton>
                <button type="button" class="point-preset" @click="testPoints = 0; applyTestPoints()">清零</button>
                <button type="button" class="point-preset" @click="testPoints = 1000; applyTestPoints()">设为 1000</button>
              </div>
            </section>

            <section class="parent-section" aria-labelledby="password-change-title">
              <div class="section-heading">
                <div>
                  <h3 id="password-change-title">修改家长密码</h3>
                  <p>密码仅保存在当前浏览器中，并以摘要形式存储。</p>
                </div>
              </div>
              <div class="password-change-grid">
                <input v-model="currentPassword" type="password" inputmode="numeric" maxlength="8" placeholder="当前密码" aria-label="当前密码" />
                <input v-model="nextPassword" type="password" inputmode="numeric" maxlength="8" placeholder="新密码（4–8位数字）" aria-label="新密码" />
                <input v-model="confirmPassword" type="password" inputmode="numeric" maxlength="8" placeholder="再次输入新密码" aria-label="确认新密码" @keyup.enter="changePassword" />
                <BaseButton @click="changePassword">更新密码</BaseButton>
              </div>
            </section>

            <div class="line"></div>

            <!-- Statistics -->
            <div class="cat-stats-summary mt-6">
              <div class="stat-row">
                <span class="cat-icon">🐱</span>
                <span>已领养猫咪:</span>
                <span class="stat-value">{{ catStore.catCount }}</span>
              </div>
              <div class="stat-row">
                <span class="cat-icon">⭐</span>
                <span>总积分:</span>
                <span class="stat-value">{{ catStore.points }}</span>
              </div>
              <div class="stat-row">
                <span class="cat-icon">🎉</span>
                <span>全对次数:</span>
                <span class="stat-value">{{ catStore.perfectGames }}</span>
              </div>
              <div class="stat-row">
                <span class="cat-icon">📖</span>
                <span>图鉴收集:</span>
                <span class="stat-value">{{ new Set(catStore.cats.map(cat => cat.photoKey)).size }}/7</span>
              </div>
              <div class="stat-row">
                <span class="cat-icon">🏥</span>
                <span>需要医疗:</span>
                <span class="stat-value">{{ catStore.cats.filter(cat => cat.status === 'sick' || cat.status === 'icu').length }}</span>
              </div>
              <div class="stat-row">
                <span class="cat-icon">🏡</span>
                <span>等待召回:</span>
                <span class="stat-value">{{ catStore.runawayCatCount }}</span>
              </div>
              <div class="stat-row" v-if="catStore.deceasedCatCount > 0">
                <span class="cat-icon">🌈</span>
                <span>已离开猫咪:</span>
                <span class="stat-value">{{ catStore.deceasedCatCount }}</span>
              </div>
            </div>

            <div class="line mt-6"></div>

            <!-- Reset -->
            <SettingItem title="重置猫咪数据" desc="清除所有猫咪数据、积分、全对记录。此操作不可撤销！">
              <PopConfirm @confirm="catStore.resetAllData()">
                <BaseButton class="bg-red-500! color-white!">重置数据</BaseButton>
              </PopConfirm>
            </SettingItem>
          </div>
        </div>

      </div>
    </div>
  </BasePage>
</template>

<style scoped lang="scss">
.setting {
  @apply text-lg;
  display: flex;
  color: var(--color-font-1);

  .left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    border-right: 2px solid gainsboro;

    .tabs {
      padding: .6rem 1.6rem;
      display: flex;
      flex-direction: column;
      gap: .6rem;
      //color: #0C8CE9;

      .tab {
        @apply cursor-pointer flex items-center relative;
        padding: .6rem .9rem;
        border-radius: .5rem;
        gap: .6rem;
        transition: all .5s;

        &:hover {
          background: var(--color-select-bg);
          color: var(--color-select-text);
        }

        &.active {
          background: var(--color-select-bg);
          color: var(--color-select-text);
        }
      }
    }
  }

  .content {
    flex: 1;
    height: 100%;
    overflow: auto;
    padding: 0 1.6rem;

    .row {
      min-height: 2.6rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: calc(var(--space) * 5);

      .wrapper {
        height: 2rem;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        gap: var(--space);

        span {
          text-align: right;
          //width: 30rem;
          font-size: .7rem;
          color: gray;
        }

        .set-key {
          align-items: center;

          input {
            width: 9rem;
            box-sizing: border-box;
            margin-right: .6rem;
            height: 1.8rem;
            outline: none;
            font-size: 1rem;
            border: 1px solid gray;
            border-radius: .2rem;
            padding: 0 .3rem;
            background: var(--color-second);
            color: var(--color-font-1);
          }

        }
      }

      .main-title {
        font-size: 1.1rem;
        font-weight: bold;
      }

      .item-title {
        font-size: 1rem;
      }

      .sub-title {
        font-size: .9rem;
      }
    }

    .body {
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .scroll {
      flex: 1;
      padding-right: .6rem;
      overflow: auto;
    }

    .line {
      border-bottom: 1px solid #c4c3c3;
    }
  }
}

@media (max-width: 768px) {
  .setting {
    flex-direction: column;

    .left {
      align-items: stretch;
      border-right: 0;
      border-bottom: 1px solid var(--color-item-border);
      margin-top: 0;

      .tabs {
        flex-direction: row;
        overflow-x: auto;
        padding: 0.5rem 0;

        .tab {
          flex: 0 0 auto;
          min-height: 44px;
        }
      }
    }

    .content {
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      padding: 0.75rem 0.25rem;

      .row {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.5rem;

        .wrapper {
          width: 100%;
          justify-content: flex-start;
        }
      }
    }
  }
}

.import {
  display: inline-flex;
  position: relative;

  input {
    position: absolute;
    height: 100%;
    width: 100%;
    opacity: 0;
  }
}

// ===== Cat Café: About 页猫咖统计 =====
.cat-stats-summary {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  background: var(--color-cat-cream);
  border-radius: 12px;
  border: 1px solid var(--color-cat-primary);

  .stat-row {
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

    .stat-value {
      font-size: 1.2rem;
      font-weight: bold;
      color: var(--color-cat-primary);
      min-width: 2rem;
      text-align: center;
    }
  }
}

@keyframes catBreathe {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

// ===== Cat Café: 家长密码门控 =====
.password-gate {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.password-card {
  box-sizing: border-box;
  background: var(--color-cat-cream);
  border: 2px solid var(--color-cat-primary);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  max-width: 360px;
  width: 100%;

  .password-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.3rem;
    color: var(--color-cat-dark, #4E342E);
    margin: 0 0 0.3rem;
  }

  .password-desc {
    font-size: 0.9rem;
    color: var(--color-sub-text, #8D6E63);
    margin: 0 0 1.2rem;
  }

  .password-input-wrap {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;

    .password-input {
      width: 160px;
      max-width: 100%;
      padding: 0.5rem 0.8rem;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 1.1rem;
      text-align: center;
      letter-spacing: 0.2rem;
      outline: none;

      &:focus {
        border-color: var(--color-cat-primary);
      }

      &:disabled {
        background: #eee;
        cursor: not-allowed;
      }
    }

    .password-btn {
      background: var(--color-cat-primary);
      color: white;
      border: none;
      font-weight: 600;
    }
  }

  .password-error {
    margin-top: 0.8rem;
    color: #E53935;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .password-hint {
    margin-top: 1rem;
    font-size: 0.75rem;
    color: #bbb;
  }
}

.password-unlocked-bar {
  padding: 0.5rem 1rem;
  background: rgba(92, 201, 167, 0.1);
  border: 1px solid var(--color-cat-success, #5CC9A7);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--color-cat-success, #5CC9A7);
  text-align: center;
  margin-bottom: 1rem;

  .relock-link {
    cursor: pointer;
    color: var(--color-cat-primary);
    font-weight: 600;
    text-decoration: underline;
  }
}

.parent-section {
  margin: 1.25rem 0;
  padding: 1.1rem;
  border: 1px solid rgba(126, 87, 194, 0.2);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  h3 { margin: 0; font-size: 1.1rem; color: var(--color-cat-dark, #4e342e); }
  p { margin: .3rem 0 0; color: var(--color-sub-text, #756b68); font-size: .82rem; line-height: 1.5; }
}

.text-action, .point-preset {
  border: 0;
  background: transparent;
  color: var(--color-cat-primary, #7e57c2);
  cursor: pointer;
  white-space: nowrap;
  text-decoration: underline;
}

.setting-notice {
  margin-top: .8rem;
  padding: .65rem .8rem;
  border-radius: 8px;
  background: #fff4d7;
  color: #795a16;
  font-size: .82rem;
}

.tuning-group {
  margin-top: 1rem;
  h4 { margin: 0; font-size: .95rem; }
  > p { margin: .25rem 0 .6rem; color: var(--color-sub-text, #756b68); font-size: .76rem; }
}

.tuning-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .55rem .9rem;
}

.tuning-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  font-size: .82rem;
}

.number-control {
  display: flex;
  align-items: center;
  gap: .3rem;
  input { width: 74px; padding: .35rem .45rem; border: 1px solid #d8d1ce; border-radius: 7px; }
  small { min-width: 2.5rem; color: var(--color-sub-text, #756b68); }
}

.test-mode-section {
  border-color: rgba(245, 158, 11, .45);
}

.test-controls, .password-change-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .6rem;
  margin-top: .9rem;

  input { box-sizing: border-box; min-width: 150px; padding: .5rem .65rem; border: 1px solid #d8d1ce; border-radius: 8px; }
  label { display: flex; align-items: center; gap: .5rem; font-size: .82rem; }
}

.test-badge {
  padding: .22rem .45rem;
  border-radius: 5px;
  background: #f59e0b;
  color: white;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
}

@media (max-width: 640px) {
  .tuning-grid { grid-template-columns: 1fr; }
  .section-heading { align-items: center; }
  .password-change-grid { align-items: stretch; flex-direction: column; }
  .password-change-grid input { width: 100%; }
}
</style>
