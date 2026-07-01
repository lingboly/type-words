<script setup lang="ts">
import {useSettingStore} from "@/stores/setting.ts";
import {onMounted} from 'vue'

const settingStore = useSettingStore()
onMounted(() => {
  if (window.matchMedia('(max-width: 768px)').matches) settingStore.showPanel = false
})
defineProps<{
  panelLeft: string
}>()
</script>

<template>
  <div class="practice-layout flex justify-center relative"
       :class="!settingStore.showToolbar && 'footer-hide'">
    <div class="wrap">
      <slot name="practice"></slot>
    </div>
    <div class="panel-wrap" :style="{left:panelLeft}">
      <slot name="panel"></slot>
    </div>
    <div class="footer-wrap">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">

.practice-layout {
  height: 100vh;
  min-height: 0;
}

.wrap {
  transition: all var(--anim-time);
  height: calc(100vh - 8rem);
}

.footer-hide {
  .wrap {
    height: calc(100vh - 3rem) !important;
  }

  .footer-wrap {
    bottom: -6rem;
  }
}

.footer-wrap {
  position: fixed;
  bottom: 0.8rem;
  transition: all var(--anim-time);
}

.panel-wrap {
  position: absolute;
  top: .8rem;
  z-index: 1;
  height: calc(100vh - 1.8rem);
}

@media (max-width: 768px) {
  .practice-layout {
    width: 100%;
    height: 100%;
  }

  .wrap {
    width: 100%;
    height: calc(100% - 9.5rem);
    padding: 0 1rem;
    box-sizing: border-box;
  }

  .footer-hide .wrap {
    height: calc(100% - 2rem) !important;
  }

  .footer-wrap {
    right: 1rem;
    bottom: calc(4.75rem + env(safe-area-inset-bottom));
    left: 1rem;
  }

  .panel-wrap {
    position: fixed;
    top: 3.5rem;
    right: 1rem;
    bottom: calc(4.75rem + env(safe-area-inset-bottom));
    left: 1rem !important;
    z-index: 90;
    height: auto;
  }
}

</style>
