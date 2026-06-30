import { del, get, set } from 'idb-keyval'
import { hashParentPassword } from '@/types/cat'

export interface LocalUser {
  username: string
  createdAt: number
  passwordHash?: string
  failedLoginAttempts?: number
  lockedUntil?: number
}

export interface UserBackup {
  version: 5
  exportedAt: number
  activeUser: string
  users: LocalUser[]
  data: Record<string, {
    indexedDb: Record<string, unknown>
    localStorage: Record<string, string | null>
  }>
}

export const ADMIN_USERNAME = 'admin'
export const USER_BACKUP_VERSION = 5
export const USER_REGISTRY_KEY = 'type-words-users-v1'
export const ACTIVE_USER_KEY = 'type-words-active-user-v1'
const USER_MIGRATION_KEY = 'type-words-user-migration-v1'
const MAX_LOGIN_ATTEMPTS = 3
const LOGIN_LOCK_DURATION = 60 * 60 * 1000

export const USER_INDEXED_DB_KEYS = [
  'typing-word-dict',
  'typing-word-setting',
  'typing-word-files',
  'cat-cafe-data',
  'type-words-app-version',
] as const

export const USER_LOCAL_STORAGE_KEYS = [
  'PracticeSaveWord',
  'PracticeSaveArticle',
] as const

function normalizeUsername(username: string): string {
  return username.trim()
}

export function getUsers(): LocalUser[] {
  try {
    const users = JSON.parse(localStorage.getItem(USER_REGISTRY_KEY) || '[]')
    if (Array.isArray(users) && users.length) return users
  } catch {
    // Recreate an invalid registry below.
  }
  const users = [{username: ADMIN_USERNAME, createdAt: Date.now()}]
  localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(users))
  return users
}

export function replaceUsers(users: LocalUser[]): LocalUser[] {
  const normalized = users
    .map(user => ({
      username: normalizeUsername(user.username),
      createdAt: Number(user.createdAt) || Date.now(),
      passwordHash: typeof user.passwordHash === 'string' ? user.passwordHash : undefined,
      failedLoginAttempts: Number(user.failedLoginAttempts) || undefined,
      lockedUntil: Number(user.lockedUntil) || undefined,
    }))
    .filter((user, index, list) => user.username && list.findIndex(item => item.username === user.username) === index)
  if (!normalized.some(user => user.username === ADMIN_USERNAME)) {
    normalized.unshift({username: ADMIN_USERNAME, createdAt: Date.now()})
  }
  localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(normalized))
  return normalized
}

function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 64 || !/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return '密码需要为 8–64 个字符，并同时包含大写和小写字母'
  }
  return null
}

export async function addUser(username: string, password: string): Promise<{success: boolean; reason?: string; user?: LocalUser}> {
  if (getCurrentUsername() !== ADMIN_USERNAME) return {success: false, reason: '仅管理员可以新增用户'}
  const normalized = normalizeUsername(username)
  if (!/^[\p{L}\p{N}_-]{1,32}$/u.test(normalized)) {
    return {success: false, reason: '用户名仅支持字母、数字、中文、下划线和短横线，最长 32 个字符'}
  }
  const users = getUsers()
  if (users.some(user => user.username.toLowerCase() === normalized.toLowerCase())) {
    return {success: false, reason: '用户名已存在'}
  }
  const passwordError = validatePassword(password)
  if (passwordError) return {success: false, reason: passwordError}
  const user = {username: normalized, createdAt: Date.now(), passwordHash: await hashParentPassword(password)}
  replaceUsers([...users, user])
  return {success: true, user}
}

export function getCurrentUsername(): string | null {
  const username = sessionStorage.getItem(ACTIVE_USER_KEY)
  return username && getUsers().some(user => user.username === username) ? username : null
}

export async function loginUser(username: string, password: string): Promise<{success: boolean; needsPasswordSetup?: boolean; reason?: string}> {
  const normalized = normalizeUsername(username)
  const users = getUsers()
  const user = users.find(item => item.username.toLowerCase() === normalized.toLowerCase())
  if (!user) return {success: false, reason: '用户不存在，请联系管理员添加'}
  if (!user.passwordHash) return {success: false, needsPasswordSetup: true}
  const now = Date.now()
  if ((user.lockedUntil ?? 0) > now) {
    return {success: false, reason: '密码错误次数过多，已拒绝尝试 1 个小时'}
  }
  if (user.lockedUntil) {
    user.lockedUntil = undefined
    user.failedLoginAttempts = undefined
  }
  if (await hashParentPassword(password) !== user.passwordHash) {
    const failedAttempts = (user.failedLoginAttempts ?? 0) + 1
    user.failedLoginAttempts = failedAttempts
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = now + LOGIN_LOCK_DURATION
      replaceUsers(users)
      return {success: false, reason: '密码错误次数过多，已拒绝尝试 1 个小时'}
    }
    replaceUsers(users)
    return {success: false, reason: `用户名或密码错误，还有 ${MAX_LOGIN_ATTEMPTS - failedAttempts} 次机会`}
  }
  user.failedLoginAttempts = undefined
  user.lockedUntil = undefined
  replaceUsers(users)
  sessionStorage.setItem(ACTIVE_USER_KEY, user.username)
  return {success: true}
}

export async function setInitialPassword(username: string, password: string): Promise<{success: boolean; reason?: string}> {
  const users = getUsers()
  const user = users.find(item => item.username.toLowerCase() === normalizeUsername(username).toLowerCase())
  if (!user) return {success: false, reason: '用户不存在'}
  if (user.passwordHash) return {success: false, reason: '该用户已经设置密码'}
  const passwordError = validatePassword(password)
  if (passwordError) return {success: false, reason: passwordError}
  user.passwordHash = await hashParentPassword(password)
  replaceUsers(users)
  sessionStorage.setItem(ACTIVE_USER_KEY, user.username)
  return {success: true}
}

export function logoutUser() {
  sessionStorage.removeItem(ACTIVE_USER_KEY)
}

export function getUserDataKey(baseKey: string, username = getCurrentUsername() || ADMIN_USERNAME): string {
  return `type-words:user:${encodeURIComponent(username)}:${baseKey}`
}

export async function migrateExistingDataToAdmin() {
  if (localStorage.getItem(USER_MIGRATION_KEY)) return
  getUsers()
  for (const baseKey of USER_INDEXED_DB_KEYS) {
    const oldValue = await get(baseKey)
    const targetKey = getUserDataKey(baseKey, ADMIN_USERNAME)
    if (oldValue !== undefined && await get(targetKey) === undefined) await set(targetKey, oldValue)
  }
  for (const baseKey of USER_LOCAL_STORAGE_KEYS) {
    const oldValue = localStorage.getItem(baseKey)
    const targetKey = getUserDataKey(baseKey, ADMIN_USERNAME)
    if (oldValue !== null && localStorage.getItem(targetKey) === null) localStorage.setItem(targetKey, oldValue)
  }
  localStorage.setItem(USER_MIGRATION_KEY, '1')
}

export async function deleteUser(username: string): Promise<{success: boolean; reason?: string}> {
  if (getCurrentUsername() !== ADMIN_USERNAME) return {success: false, reason: '仅管理员可以删除用户'}
  if (username === ADMIN_USERNAME) return {success: false, reason: '不能删除管理员用户'}
  if (username === getCurrentUsername()) return {success: false, reason: '不能删除当前登录用户'}
  const users = getUsers()
  if (!users.some(user => user.username === username)) return {success: false, reason: '用户不存在'}
  for (const key of USER_INDEXED_DB_KEYS) await del(getUserDataKey(key, username))
  for (const key of USER_LOCAL_STORAGE_KEYS) localStorage.removeItem(getUserDataKey(key, username))
  replaceUsers(users.filter(user => user.username !== username))
  return {success: true}
}

export async function createBackup(): Promise<UserBackup> {
  const users = getUsers()
  const data: UserBackup['data'] = {}
  for (const user of users) {
    const indexedDb: Record<string, unknown> = {}
    const local: Record<string, string | null> = {}
    for (const key of USER_INDEXED_DB_KEYS) {
      if (key !== 'typing-word-files') indexedDb[key] = await get(getUserDataKey(key, user.username))
    }
    for (const key of USER_LOCAL_STORAGE_KEYS) local[key] = localStorage.getItem(getUserDataKey(key, user.username))
    data[user.username] = {indexedDb, localStorage: local}
  }
  return {
    version: USER_BACKUP_VERSION,
    exportedAt: Date.now(),
    activeUser: getCurrentUsername() || ADMIN_USERNAME,
    users,
    data,
  }
}

export async function restoreBackup(backup: UserBackup) {
  if (backup?.version !== USER_BACKUP_VERSION || !Array.isArray(backup.users) || !backup.data) {
    throw new Error('不支持的数据备份格式')
  }
  const existingUsers = getUsers()
  const users = replaceUsers(backup.users)
  for (const username of new Set([...existingUsers, ...users].map(user => user.username))) {
    for (const key of USER_INDEXED_DB_KEYS) await del(getUserDataKey(key, username))
    for (const key of USER_LOCAL_STORAGE_KEYS) localStorage.removeItem(getUserDataKey(key, username))
  }
  for (const user of users) {
    const userData = backup.data[user.username]
    if (!userData) continue
    for (const [key, value] of Object.entries(userData.indexedDb || {})) {
      if (USER_INDEXED_DB_KEYS.includes(key as typeof USER_INDEXED_DB_KEYS[number]) && value !== undefined) {
        await set(getUserDataKey(key, user.username), value)
      }
    }
    for (const [key, value] of Object.entries(userData.localStorage || {})) {
      if (USER_LOCAL_STORAGE_KEYS.includes(key as typeof USER_LOCAL_STORAGE_KEYS[number]) && value !== null) {
        localStorage.setItem(getUserDataKey(key, user.username), value)
      }
    }
  }
  const activeUser = users.some(user => user.username === backup.activeUser) ? backup.activeUser : ADMIN_USERNAME
  sessionStorage.setItem(ACTIVE_USER_KEY, activeUser)
}
