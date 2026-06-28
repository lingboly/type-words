import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatStore } from '@/stores/cat'
import {
  CAT_MEDICINE_PRICE,
  CAT_FOOD_PRICE,
  CAT_TOY_PRICE,
  COMMUNITY_HEAL_STREAK,
  ICU_DAILY_COST,
  MAX_DAILY_PLAYS,
  PREMIUM_CAT_FOOD_PRICE,
  RUNAWAY_RECALL_DAYS,
  rollCatRarity,
  type Cat,
} from '@/types/cat'

const storage = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('idb-keyval', () => ({
  get: storage.get,
  set: storage.set,
}))

function makeCat(overrides: Partial<Cat> = {}): Cat {
  return {
    id: 'cat-1',
    photoKey: '2妹-三花猫.jpg',
    name: '二妹',
    adoptedAt: Date.now(),
    status: 'healthy',
    health: 100,
    affection: 80,
    hunger: 40,
    feedCount: 0,
    playCount: 0,
    lastLoginCheck: Date.now(),
    ...overrides,
  }
}

describe('cat store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    storage.get.mockReset()
    storage.set.mockReset()
  })

  it('loads persisted state and marks the store as ready', async () => {
    storage.get.mockResolvedValue({
      cats: [makeCat()],
      points: 75,
      catEnabled: false,
    })
    const store = useCatStore()

    await store.loadFromStorage()

    expect(store.catCount).toBe(1)
    expect(store.points).toBe(75)
    expect(store.catEnabled).toBe(false)
    expect(store.loaded).toBe(true)
  })

  it('adopts a cat only after a perfect non-empty session', () => {
    const store = useCatStore()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(store.recordGameSession(0.9, 9, 10)).toBeNull()
    expect(store.recordGameSession(1, 0, 0)).toBeNull()

    const adopted = store.recordGameSession(1, 10, 10)
    expect(adopted?.name).toBe('二妹')
    expect(store.catCount).toBe(1)
    expect(store.perfectGames).toBe(1)
    expect(store.newAdoptedCatId).toBe(adopted?.id)
  })

  it('feeds a cat, spends points, and improves its state', () => {
    const store = useCatStore()
    store.cats = [makeCat({ status: 'sick', health: 29, hunger: 60 })]
    store.points = CAT_FOOD_PRICE

    expect(store.feedCat('cat-1')).toEqual({ success: true })
    expect(store.points).toBe(0)
    expect(store.cats[0]).toMatchObject({
      health: 31,
      hunger: 50,
      feedCount: 1,
      status: 'healthy',
    })
  })

  it('does not charge points when an interaction is rejected', () => {
    const store = useCatStore()
    store.cats = [makeCat({ status: 'sick' })]
    store.points = CAT_TOY_PRICE

    expect(store.playWithCat('cat-1')).toEqual({
      success: false,
      reason: '猫咪身体虚弱，暂时不能玩耍',
    })
    expect(store.points).toBe(CAT_TOY_PRICE)
  })

  it('caps interaction values and rejects unavailable cats', () => {
    const store = useCatStore()
    store.cats = [makeCat({ affection: 99, health: 100 })]
    store.points = CAT_TOY_PRICE

    expect(store.playWithCat('cat-1')).toMatchObject({ success: true, affectionGain: 5, healthGain: 1 })
    expect(store.cats[0].affection).toBe(100)
    expect(store.cats[0].health).toBe(100)

    store.cats[0].status = 'runaway'
    expect(store.petCat('cat-1')).toEqual({ success: false, affectionGain: 0 })
  })

  it('applies offline hunger and health decay', () => {
    const store = useCatStore()
    const now = new Date('2026-06-28T08:00:00Z').getTime()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    store.cats = [makeCat({
      health: 100,
      hunger: 40,
      lastLoginCheck: now - 4 * 60 * 60 * 1000,
    })]

    store.checkOfflineDecay()

    expect(store.cats[0].hunger).toBe(100)
    expect(store.cats[0].health).toBe(96)
    expect(store.cats[0].lastLoginCheck).toBe(now)
  })

  it('resets all cat progress without changing feature preferences', () => {
    const store = useCatStore()
    store.cats = [makeCat()]
    store.points = 90
    store.perfectGames = 4
    store.catEnabled = false

    store.resetAllData()

    expect(store.cats).toEqual([])
    expect(store.points).toBe(0)
    expect(store.perfectGames).toBe(0)
    expect(store.catEnabled).toBe(false)
  })

  it('derives deceased, newly adopted, and affordability UI state', () => {
    const store = useCatStore()
    store.cats = [
      makeCat({ id: 'alive' }),
      makeCat({ id: 'gone', status: 'deceased' }),
    ]
    store.newAdoptedCatId = 'alive'
    store.points = 30

    expect(store.deceasedCatCount).toBe(1)
    expect(store.newAdoptedCat?.id).toBe('alive')
    expect(store.canAfford(30)).toBe(true)
    expect(store.canAfford(31)).toBe(false)
  })

  it('rolls only unlocked rarity tiers', () => {
    expect(rollCatRarity(0, 0)).toBe('common')
    expect(rollCatRarity(3, 0.1)).toBe('rare')
    expect(rollCatRarity(10, 0.01)).toBe('premium')
    expect(rollCatRarity(10, 0.2)).toBe('rare')
    expect(rollCatRarity(10, 0.9)).toBe('common')
  })

  it('applies premium food effects and rejects unaffordable care', () => {
    const store = useCatStore()
    store.cats = [makeCat({ affection: 70, hunger: 50 })]
    store.points = PREMIUM_CAT_FOOD_PRICE

    expect(store.feedCat('cat-1', 'premium')).toEqual({ success: true })
    expect(store.cats[0]).toMatchObject({ hunger: 30, affection: 72, feedCount: 1 })
    expect(store.points).toBe(0)
    expect(store.feedCat('cat-1')).toMatchObject({ success: false })
  })

  it('enforces the daily play limit without charging rejected attempts', () => {
    const store = useCatStore()
    store.cats = [makeCat({
      interactionDate: new Date().toISOString().slice(0, 10),
      dailyPlayCount: MAX_DAILY_PLAYS,
    })]
    store.points = CAT_TOY_PRICE

    expect(store.playWithCat('cat-1')).toMatchObject({ success: false })
    expect(store.points).toBe(CAT_TOY_PRICE)
  })

  it('heals sick and ICU cats with medicine', () => {
    const store = useCatStore()
    store.cats = [makeCat({ status: 'icu', health: 0 })]
    store.points = CAT_MEDICINE_PRICE

    expect(store.healCat('cat-1')).toEqual({ success: true, healthGain: 20 })
    expect(store.cats[0]).toMatchObject({ status: 'healthy', health: 20, icuFailedDays: 0 })
  })

  it('charges ICU care by elapsed day and records failed rescue days', () => {
    const store = useCatStore()
    store.points = ICU_DAILY_COST
    store.cats = [makeCat({
      status: 'icu',
      health: 0,
      icuLastChargeDate: '2026-06-26',
      icuFailedDays: 0,
    })]

    store.processIcuCharges(store.cats[0], new Date('2026-06-28T08:00:00Z').getTime())

    expect(store.points).toBe(0)
    expect(store.cats[0].icuFailedDays).toBe(1)
    expect(store.cats[0].status).toBe('icu')
  })

  it('recalls a runaway cat after seven consecutive remote-care days', () => {
    const store = useCatStore()
    store.points = CAT_FOOD_PRICE
    store.cats = [makeCat({
      status: 'runaway',
      runawayFeedDate: '2026-06-27',
      runawayFeedStreak: RUNAWAY_RECALL_DAYS - 1,
    })]
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-28T08:00:00Z').getTime())

    expect(store.feedCat('cat-1')).toEqual({ success: true, recalled: true })
    expect(store.cats[0]).toMatchObject({ status: 'healthy', affection: 50, runawayFeedStreak: 0 })
  })

  it('heals eligible cats after five consecutive perfect sessions', () => {
    const store = useCatStore()
    store.cats = [
      makeCat({ id: 'sick', status: 'sick', health: 12 }),
      makeCat({ id: 'icu', status: 'icu', health: 0 }),
      makeCat({ id: 'away', status: 'runaway', health: 50 }),
    ]
    store.perfectStreak = COMMUNITY_HEAL_STREAK - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    store.recordGameSession(1, 10, 10)

    expect(store.getCatById('sick')).toMatchObject({ status: 'healthy', health: 100 })
    expect(store.getCatById('icu')).toMatchObject({ status: 'icu', health: 0 })
    expect(store.getCatById('away')).toMatchObject({ status: 'runaway', health: 50 })
    expect(store.perfectStreak).toBe(0)
    expect(store.communityHealCount).toBe(1)
  })

  it('persists and applies parent-managed prices and interaction limits', () => {
    const store = useCatStore()
    store.cats = [makeCat({ dailyPlayCount: 1 })]
    store.points = 12

    store.updateTuning('basicFoodPrice', 12)
    store.updateTuning('dailyPlayLimit', 1)

    expect(store.feedCat('cat-1')).toEqual({ success: true })
    expect(store.points).toBe(0)
    expect(store.playWithCat('cat-1')).toMatchObject({ success: false })
    expect(storage.set).toHaveBeenCalled()
  })

  it('only allows direct point adjustment in test mode and clamps unsafe values', () => {
    const store = useCatStore()
    store.points = 25

    expect(store.setTestPoints(999)).toBe(false)
    expect(store.points).toBe(25)

    store.setTestMode(true)
    expect(store.setTestPoints(1234.4)).toBe(true)
    expect(store.points).toBe(1234)
    expect(store.setTestPoints(-10)).toBe(true)
    expect(store.points).toBe(0)
  })

  it('changes the parent password only after current-password verification', async () => {
    const store = useCatStore()

    expect(await store.verifyParentPassword('1234')).toBe(true)
    expect(await store.changeParentPassword('0000', '5678')).toBe(false)
    expect(await store.changeParentPassword('1234', '5678')).toBe(true)
    expect(await store.verifyParentPassword('1234')).toBe(false)
    expect(await store.verifyParentPassword('5678')).toBe(true)
  })

  it('migrates older saves with default tuning and restores persisted parent controls', async () => {
    storage.get.mockResolvedValue({
      cats: [],
      tuning: { basicFoodPrice: 7 },
      testMode: true,
    })
    const store = useCatStore()

    await store.loadFromStorage()

    expect(store.tuning.basicFoodPrice).toBe(7)
    expect(store.tuning.dailyPlayLimit).toBe(MAX_DAILY_PLAYS)
    expect(store.testMode).toBe(true)
  })
})
