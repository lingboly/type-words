import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'

const idbState = vi.hoisted(() => ({
  database: new Map<string, unknown>(),
  setHook: null as null | ((key: string, value: unknown) => Promise<void>),
}))
const database = idbState.database

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => database.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (idbState.setHook) return idbState.setHook(key, value)
    database.set(key, value)
  }),
  del: vi.fn(async (key: string) => { database.delete(key) }),
}))

import {
  ACTIVE_USER_KEY,
  ADMIN_USERNAME,
  USER_REGISTRY_KEY,
  addUser,
  createBackup,
  deleteUser,
  getCurrentUsername,
  getUserDataKey,
  getUsers,
  loginUser,
  logoutUser,
  migrateExistingDataToAdmin,
  restoreBackup,
  setInitialPassword,
} from '@/services/user-data'
import {useCatStore} from '@/stores/cat'

describe('multi-user data isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    database.clear()
    idbState.setHook = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requires admin to set a password on first login', async () => {
    expect(getUsers().map(user => user.username)).toEqual([ADMIN_USERNAME])
    expect(await loginUser('missing', 'pass')).toMatchObject({success: false})
    expect(getCurrentUsername()).toBeNull()
    expect(await loginUser(ADMIN_USERNAME, 'pass')).toEqual({success: false, needsPasswordSetup: true})
    expect(await setInitialPassword(ADMIN_USERNAME, 'AdminPass')).toEqual({success: true})
    expect(await loginUser(ADMIN_USERNAME, 'wrong')).toMatchObject({success: false})
    expect(await loginUser(ADMIN_USERNAME, 'AdminPass')).toEqual({success: true})
    expect(getCurrentUsername()).toBe(ADMIN_USERNAME)
  })

  it('requires passwords of at least eight characters with uppercase and lowercase letters', async () => {
    expect(await setInitialPassword(ADMIN_USERNAME, 'short')).toEqual({
      success: false,
      reason: '密码需要为 8–64 个字符，并同时包含大写和小写字母',
    })
    expect(await setInitialPassword(ADMIN_USERNAME, 'lowercase')).toMatchObject({success: false})
    expect(await setInitialPassword(ADMIN_USERNAME, 'UPPERCASE')).toMatchObject({success: false})
    expect(await setInitialPassword(ADMIN_USERNAME, 'ValidPass')).toEqual({success: true})

    expect(await addUser('weak-user', 'alllowercase')).toMatchObject({success: false})
    expect(await addUser('valid-user', 'UserPass')).toMatchObject({success: true})
  })

  it('warns after two failed passwords and locks the account for one hour after the third', async () => {
    await setInitialPassword(ADMIN_USERNAME, 'AdminPass')
    logoutUser()
    const now = 1_780_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    expect(await loginUser(ADMIN_USERNAME, 'WrongPass')).toEqual({
      success: false,
      reason: '用户名或密码错误，还有 2 次机会',
    })
    expect(await loginUser(ADMIN_USERNAME, 'WrongPass')).toEqual({
      success: false,
      reason: '用户名或密码错误，还有 1 次机会',
    })
    expect(await loginUser(ADMIN_USERNAME, 'WrongPass')).toEqual({
      success: false,
      reason: '密码错误次数过多，已拒绝尝试 1 个小时',
    })
    expect(await loginUser(ADMIN_USERNAME, 'AdminPass')).toEqual({
      success: false,
      reason: '密码错误次数过多，已拒绝尝试 1 个小时',
    })

    vi.mocked(Date.now).mockReturnValue(now + 60 * 60 * 1000 + 1)
    expect(await loginUser(ADMIN_USERNAME, 'AdminPass')).toEqual({success: true})
    expect(getUsers()[0]).not.toHaveProperty('failedLoginAttempts')
    expect(getUsers()[0]).not.toHaveProperty('lockedUntil')
  })

  it('only lets admin create password-protected users and gives each user separate keys', async () => {
    expect(await addUser('alice', 'AlicePass')).toMatchObject({success: false})
    await setInitialPassword(ADMIN_USERNAME, 'AdminPass')
    expect(await addUser('alice', 'AlicePass')).toMatchObject({success: true, user: {username: 'alice'}})
    expect(getUsers().find(user => user.username === 'alice')?.passwordHash).toBeTruthy()
    expect(getUserDataKey('typing-word-dict', 'alice')).not.toBe(getUserDataKey('typing-word-dict', ADMIN_USERNAME))

    sessionStorage.setItem(ACTIVE_USER_KEY, 'alice')
    expect(await addUser('bob', 'BobPasswd')).toMatchObject({success: false})
  })

  it('migrates existing unscoped data to admin without resetting it', async () => {
    database.set('typing-word-dict', 'existing dictionary')
    database.set('cat-cafe-data', {points: 321, cats: [{id: 'cat-1'}]})
    localStorage.setItem('PracticeSaveWord', 'existing progress')

    await migrateExistingDataToAdmin()

    expect(database.get(getUserDataKey('typing-word-dict', ADMIN_USERNAME))).toBe('existing dictionary')
    expect(database.get(getUserDataKey('cat-cafe-data', ADMIN_USERNAME))).toEqual({points: 321, cats: [{id: 'cat-1'}]})
    expect(localStorage.getItem(getUserDataKey('PracticeSaveWord', ADMIN_USERNAME))).toBe('existing progress')
  })

  it('backs up and restores every user independently', async () => {
    await setInitialPassword(ADMIN_USERNAME, 'AdminPass')
    await addUser('alice', 'AlicePass')
    database.set(getUserDataKey('typing-word-dict', ADMIN_USERNAME), 'admin words')
    database.set(getUserDataKey('cat-cafe-data', 'alice'), {points: 99})
    localStorage.setItem(getUserDataKey('PracticeSaveArticle', 'alice'), 'alice progress')

    const backup = await createBackup()
    localStorage.removeItem(USER_REGISTRY_KEY)
    database.clear()
    await restoreBackup(backup)

    expect(getUsers().map(user => user.username)).toEqual([ADMIN_USERNAME, 'alice'])
    expect(database.get(getUserDataKey('typing-word-dict', ADMIN_USERNAME))).toBe('admin words')
    expect(database.get(getUserDataKey('cat-cafe-data', 'alice'))).toEqual({points: 99})
    expect(localStorage.getItem(getUserDataKey('PracticeSaveArticle', 'alice'))).toBe('alice progress')
  })

  it('exports and restores word memorization records and complete cat data after all current data is cleared', async () => {
    await setInitialPassword(ADMIN_USERNAME, 'AdminPass')
    await addUser('alice', 'AlicePass')
    sessionStorage.setItem(ACTIVE_USER_KEY, 'alice')

    const wordDictionary = {
      version: 4,
      val: {
        word: {
          studyIndex: 2,
          bookList: [{id: 'shanghai-primary-5', lastLearnIndex: 18, statistics: [{total: 10, wrong: 1}]}],
        },
      },
    }
    const practiceProgress = {
      version: 1,
      val: {
        taskWords: {new: [{word: 'future'}], review: [], write: []},
        practiceData: {index: 3, wrongWords: [{word: 'future'}]},
        statStoreData: {total: 4, wrong: 1},
      },
    }
    const catData = {
      cats: [{
        id: 'cat-alice-1',
        photoKey: '花奴-三花猫.jpg',
        name: '花奴',
        adoptedAt: 1710000000000,
        status: 'healthy',
        rarity: 'common',
        health: 87,
        affection: 76,
        hunger: 21,
        feedCount: 2,
        playCount: 3,
        lastLoginCheck: Date.now(),
        interactionDate: '2026-06-29',
        dailyPetPoints: 4,
        dailyPlayCount: 1,
        runawayFeedStreak: 0,
        icuFailedDays: 0,
      }],
      points: 680,
      perfectGames: 3,
      perfectStreak: 2,
      communityHealCount: 1,
      lastGameAccuracy: 1,
      catEnabled: true,
      showPracticeCompanion: true,
      showAnimations: true,
    }

    database.set(getUserDataKey('typing-word-dict', 'alice'), JSON.stringify(wordDictionary))
    database.set(getUserDataKey('cat-cafe-data', 'alice'), catData)
    localStorage.setItem(getUserDataKey('PracticeSaveWord', 'alice'), JSON.stringify(practiceProgress))

    const exportedPackage = JSON.parse(JSON.stringify(await createBackup()))
    expect(exportedPackage.data.alice.indexedDb['cat-cafe-data']).toEqual(catData)
    expect(exportedPackage.data.alice.indexedDb['typing-word-dict']).toBe(JSON.stringify(wordDictionary))
    expect(exportedPackage.data.alice.localStorage.PracticeSaveWord).toBe(JSON.stringify(practiceProgress))

    database.clear()
    localStorage.clear()
    sessionStorage.clear()
    await restoreBackup(exportedPackage)

    expect(database.get(getUserDataKey('typing-word-dict', 'alice'))).toBe(JSON.stringify(wordDictionary))
    expect(localStorage.getItem(getUserDataKey('PracticeSaveWord', 'alice'))).toBe(JSON.stringify(practiceProgress))
    expect(getCurrentUsername()).toBe('alice')

    setActivePinia(createPinia())
    const restoredCatStore = useCatStore()
    await restoredCatStore.loadFromStorage()
    expect(restoredCatStore.points).toBe(680)
    expect(restoredCatStore.perfectGames).toBe(3)
    expect(restoredCatStore.cats).toHaveLength(1)
    expect(restoredCatStore.cats[0]).toMatchObject({
      id: 'cat-alice-1',
      name: '花奴',
      health: 87,
      affection: 76,
      hunger: 21,
    })
  })

  it('does not let a pending cat reset overwrite an imported backup', async () => {
    await setInitialPassword(ADMIN_USERNAME, 'AdminPass')
    setActivePinia(createPinia())
    const catStore = useCatStore()
    catStore.cats = [{
      id: 'cat-admin-1',
      photoKey: '三弟-穿绿衣服的粽子狸花猫.jpg',
      name: '三弟',
      adoptedAt: Date.now(),
      status: 'healthy',
      rarity: 'common',
      health: 100,
      affection: 80,
      hunger: 20,
      feedCount: 0,
      playCount: 0,
      lastLoginCheck: Date.now(),
      interactionDate: '2026-06-29',
      dailyPetPoints: 0,
      dailyPlayCount: 0,
      runawayFeedStreak: 0,
      icuFailedDays: 0,
    }]
    await catStore.persist()
    const backup = JSON.parse(JSON.stringify(await createBackup()))

    let releaseResetWrite: (() => void) | undefined
    idbState.setHook = (key, value) => new Promise<void>(resolve => {
      releaseResetWrite = () => {
        database.set(key, value)
        resolve()
      }
    })
    catStore.resetAllData()
    await vi.waitFor(() => expect(releaseResetWrite).toBeTypeOf('function'))

    idbState.setHook = null
    const restorePromise = (async () => {
      await catStore.flushPersistence()
      await restoreBackup(backup)
    })()
    releaseResetWrite?.()
    await restorePromise

    setActivePinia(createPinia())
    const restoredCatStore = useCatStore()
    await restoredCatStore.loadFromStorage()
    expect(restoredCatStore.cats).toHaveLength(1)
    expect(restoredCatStore.cats[0].name).toBe('三弟')
  })

  it('deletes another user and all of their data', async () => {
    await setInitialPassword(ADMIN_USERNAME, 'AdminPass')
    await addUser('alice', 'AlicePass')
    database.set(getUserDataKey('cat-cafe-data', 'alice'), {points: 99})

    expect(await deleteUser('alice')).toEqual({success: true})
    expect(getUsers().map(user => user.username)).toEqual([ADMIN_USERNAME])
    expect(database.has(getUserDataKey('cat-cafe-data', 'alice'))).toBe(false)
  })
})
