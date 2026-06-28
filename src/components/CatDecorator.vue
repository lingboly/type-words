<script setup lang="ts">
/**
 * CatDecorator — 轻量猫咪装饰组件
 * 使用 emoji + CSS 动画，用于练习页、结算页、首页的猫元素点缀
 *
 * Props:
 *   pose: 'idle' | 'happy' | 'sleeping' | 'purring' | 'curious' | 'annoyed' | 'sick'
 *   size: 'sm' | 'md' | 'lg' | 'xl'
 *   showAnimation: boolean — 是否启用呼吸/尾巴/眨眼等持续动画
 */

import { getCurrentInstance } from 'vue'

interface IProps {
  pose?: 'idle' | 'happy' | 'sleeping' | 'purring' | 'curious' | 'annoyed' | 'sick'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showAnimation?: boolean
}

const props = withDefaults(defineProps<IProps>(), {
  pose: 'idle',
  size: 'md',
  showAnimation: true,
})

const catId = `cat-${getCurrentInstance()?.uid ?? 'decorator'}`

// 表情映射
const exprMap: Record<string, string> = {
  idle: '🐱',
  happy: '😸',
  sleeping: '😴',
  purring: '😺',
  curious: '🙀',
  annoyed: '😾',
  sick: '🤒',
}

const emoji = $computed(() => exprMap[props.pose] || exprMap.idle)

// 动画 class 组合
const animClass = $computed(() => {
  const cls: string[] = [`cat-${props.size}`]
  if (props.showAnimation) {
    cls.push('anim-cat-breathe')
    cls.push('anim-cat-tail')
    cls.push('anim-cat-blink')
    if (props.pose === 'purring') cls.push('anim-cat-purr')
  }
  return cls.join(' ')
})

// 对外暴露触发动作的方法
function triggerHappy() {
  // 通过 DOM 操作添加一次性的 happy 动画 class
  const el = document.querySelector(`[data-cat-id="${catId}"]`) as HTMLElement
  if (el) {
    el.classList.add('anim-cat-happy')
    setTimeout(() => el.classList.remove('anim-cat-happy'), 600)
  }
}

function triggerShake() {
  const el = document.querySelector(`[data-cat-id="${catId}"]`) as HTMLElement
  if (el) {
    el.classList.add('anim-cat-shake')
    setTimeout(() => el.classList.remove('anim-cat-shake'), 800)
  }
}

defineExpose({ triggerHappy, triggerShake })
</script>

<template>
  <span
    class="cat-decorator"
    :class="animClass"
    :data-cat-id="catId"
    :title="pose"
  >
    {{ emoji }}
  </span>
</template>

<style scoped lang="scss">
.cat-decorator {
  display: inline-block;
  line-height: 1;
  user-select: none;
  cursor: default;
  transition: transform 0.2s;

  // 呼吸 + 尾巴摇摆组合
  &.anim-cat-breathe.anim-cat-tail {
    animation: breatheTail 3s ease-in-out infinite;
  }
}

@keyframes breatheTail {
  0%, 100% {
    transform: scaleY(1) translateY(0) rotate(0deg);
  }
  25% {
    transform: scaleY(1.02) translateY(-2px) rotate(-2deg);
  }
  50% {
    transform: scaleY(1.03) translateY(-3px) rotate(0deg);
  }
  75% {
    transform: scaleY(1.02) translateY(-2px) rotate(2deg);
  }
}
</style>
