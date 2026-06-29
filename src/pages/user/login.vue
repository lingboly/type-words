<script setup lang="ts">
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'
import Toast from '@/components/base/toast/Toast.ts'
import { APP_NAME } from '@/config/env.ts'
import { getUsers, loginUser, migrateExistingDataToAdmin, setInitialPassword } from '@/services/user-data'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
let username = $ref('')
let password = $ref('')
let confirmPassword = $ref('')
let loggingIn = $ref(false)
const users = $computed(() => getUsers())
const selectedUser = $computed(() => users.find(user => user.username.toLowerCase() === username.trim().toLowerCase()))
const needsPasswordSetup = $computed(() => Boolean(selectedUser && !selectedUser.passwordHash))

async function login() {
  if (!username.trim()) return Toast.warning('请输入用户名')
  loggingIn = true
  try {
    if (needsPasswordSetup) {
      if (password !== confirmPassword) return Toast.error('两次输入的密码不一致')
      const setup = await setInitialPassword(username, password)
      if (!setup.success) return Toast.error(setup.reason || '密码设置失败')
    } else {
      const result = await loginUser(username, password)
      if (!result.success) return Toast.error(result.reason || '登录失败')
    }
    await migrateExistingDataToAdmin()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    window.location.assign(router.resolve(redirect).href)
  } finally {
    loggingIn = false
  }
}
</script>

<template>
  <div class="login-page center h-screen">
    <main class="login-card">
      <h1>{{ APP_NAME }}</h1>
      <p>请输入管理员已创建的用户名登录</p>
      <label>
        <span>用户名</span>
        <BaseInput v-model="username" type="text" autocomplete="username" @keyup.enter="login" />
      </label>
      <label>
        <span>{{ needsPasswordSetup ? '首次登录，请设置密码' : '密码' }}</span>
        <BaseInput v-model="password" type="password" autocomplete="current-password" @keyup.enter="login" />
      </label>
      <label v-if="needsPasswordSetup">
        <span>确认密码</span>
        <BaseInput v-model="confirmPassword" type="password" autocomplete="new-password" @keyup.enter="login" />
      </label>
      <BaseButton class="w-full" :loading="loggingIn" @click="login">{{ needsPasswordSetup ? '设置密码并登录' : '登录' }}</BaseButton>
      <div class="known-users" v-if="users.length">
        <small>可登录用户</small>
        <button v-for="user in users" :key="user.username" type="button" @click="username = user.username">
          {{ user.username }}
        </button>
      </div>
      <p class="hint">不能在登录页注册新用户；请由管理员在“设置 → 数据管理”中添加。</p>
    </main>
  </div>
</template>

<style scoped lang="scss">
.login-page { background: var(--color-primary); }
.login-card {
  width: min(24rem, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  border-radius: 1rem;
  background: var(--color-second);
  box-shadow: var(--shadow);
  color: var(--color-font-1);
  box-sizing: border-box;
  h1, p { margin: 0; text-align: center; }
  label { display: flex; flex-direction: column; gap: .5rem; }
}
.known-users {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  button { border: 1px solid var(--color-item-border); border-radius: .4rem; padding: .35rem .65rem; cursor: pointer; }
}
.hint { color: gray; font-size: .85rem; }
</style>
