<script setup lang="ts">

import {ShortcutKey} from "@/types/types.ts";
import Logo from "@/components/Logo.vue";
import {useSettingStore} from "@/stores/setting.ts";
import {useRouter} from "vue-router";
import useTheme from "@/hooks/theme.ts";
import BaseIcon from "@/components/BaseIcon.vue";
import {useRuntimeStore} from "@/stores/runtime.ts";
import { getCurrentUsername, logoutUser } from '@/services/user-data'


const settingStore = useSettingStore()
const runtimeStore = useRuntimeStore()
const router = useRouter()
const {toggleTheme} = useTheme()
const currentUsername = getCurrentUsername()

function logout() {
  logoutUser()
  window.location.assign(router.resolve('/login').href)
}


</script>

<template>
  <div class="layout anim">
    <div class="account-menu" aria-label="当前登录账户">
      <IconFluentPerson20Regular/>
      <span>{{ currentUsername }}</span>
      <button type="button" @click="logout">登出</button>
    </div>
    <!--    第一个aside 占位用-->
    <div class="aside space" :class="{'expand':settingStore.sideExpand}"></div>
    <div class="aside anim fixed" :class="{'expand':settingStore.sideExpand}">
      <div class="top">
        <Logo class="sidebar-logo" v-if="settingStore.sideExpand"/>
        <button type="button" class="row" aria-label="主页" @click="router.push('/')">
          <IconFluentHome20Regular/>
          <span v-if="settingStore.sideExpand">主页</span>
        </button>
        <button type="button" class="row" aria-label="单词" @click="router.push('/words')">
          <IconFluentTextUnderlineDouble20Regular/>
          <span v-if="settingStore.sideExpand">单词</span>
        </button>
        <button type="button" class="row" aria-label="文章" @click="router.push('/articles')">
          <!--          <IconPhArticleNyTimes/>-->
          <IconFluentBookLetter20Regular/>
          <span v-if="settingStore.sideExpand">文章</span>
        </button>
        <button type="button" class="row" aria-label="设置" @click="router.push('/setting')">
          <IconFluentSettings20Regular/>
          <span v-if="settingStore.sideExpand">设置</span>
          <div class="red-point" :class="!settingStore.sideExpand && 'top-1 right-0'" v-if="runtimeStore.isNew"></div>
        </button>
<!--        <div class="row" @click="router.push('/user')">-->
<!--          <IconFluentPerson20Regular/>-->
<!--          <span v-if="settingStore.sideExpand">用户</span>-->
<!--        </div>-->
      </div>
      <div class="bottom flex justify-evenly ">
        <BaseIcon
            @click="settingStore.sideExpand = !settingStore.sideExpand">
          <IconFluentChevronLeft20Filled v-if="settingStore.sideExpand"/>
          <IconFluentChevronLeft20Filled class="transform-rotate-180" v-else/>
        </BaseIcon>
        <BaseIcon
            v-if="settingStore.sideExpand"
            :title="`切换主题(${settingStore.shortcutKeyMap[ShortcutKey.ToggleTheme]})`"
            @click="toggleTheme"
        >
          <IconFluentWeatherMoon16Regular v-if="settingStore.theme === 'light'"/>
          <IconFluentWeatherSunny16Regular v-else/>
        </BaseIcon>
      </div>
    </div>
    <div class="content-shell flex-1 z-1 relative">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout {
  width: 100%;
  height: 100%;
  display: flex;
  background: var(--color-primary);
}

.content-shell {
  min-width: 0;
  overflow-x: hidden;
}

.account-menu {
  position: fixed;
  top: .75rem;
  right: 1rem;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .45rem .65rem;
  border: 1px solid var(--color-item-border);
  border-radius: .65rem;
  background: var(--color-second);
  color: var(--color-font-1);
  box-shadow: var(--shadow);

  button {
    border: 0;
    border-left: 1px solid var(--color-item-border);
    padding-left: .6rem;
    background: transparent;
    color: var(--color-icon-hightlight);
    cursor: pointer;
  }
}

.aside {
  background: var(--color-second);
  height: 100vh;
  padding: 1rem 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: rgb(0 0 0 / 3%) 0px 0px 12px 0px;
  width: 4.5rem;
  z-index: 2;

  .row {
    @apply cursor-pointer rounded-md  text p-2 my-2 flex items-center gap-2 relative shrink-0;
    transition: all .5s;
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;

    &:hover {
      background: var(--color-select-bg);
      color: white;
    }

    span {
      flex-shrink: 0;
    }

    svg {
      flex-shrink: 0;
      font-size: 1.3rem !important;
    }
  }

  &.expand {
    width: var(--aside-width);
  }
}

@media (max-width: 768px) {
  .layout {
    box-sizing: border-box;
    min-height: 100dvh;
    height: 100dvh;
    padding-bottom: calc(4.25rem + env(safe-area-inset-bottom));
    flex-direction: column;
  }

  .content-shell {
    width: 100%;
    min-height: 0;
  }

  .account-menu {
    position: relative;
    top: auto;
    right: auto;
    flex-shrink: 0;
    align-self: flex-end;
    margin: .4rem .6rem .2rem;
    padding: .35rem .55rem;
    box-shadow: none;
  }

  .aside.space {
    display: none;
  }

  .aside.fixed,
  .aside.fixed.expand {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    height: calc(4.25rem + env(safe-area-inset-bottom));
    padding: .35rem .75rem env(safe-area-inset-bottom);
    flex-direction: row;
    align-items: center;
    z-index: 100;

    .top {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-around;
    }

    .sidebar-logo,
    .bottom,
    .row span {
      display: none;
    }

    .row {
      width: auto;
      min-width: 2.75rem;
      min-height: 2.75rem;
      margin: 0;
      justify-content: center;
    }
  }
}
</style>
