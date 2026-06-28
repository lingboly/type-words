import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatStore } from '@/stores/cat'
import {
  CAT_FOOD_PRICE,
  CAT_TOY_PRICE,
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
      reason: 'Cat is too weak to play',
    })
    expect(store.points).toBe(CAT_TOY_PRICE)
  })

  it('caps interaction values and rejects unavailable cats', () => {
    const store = useCatStore()
    store.cats = [makeCat({ affection: 99, health: 100 })]
    store.points = CAT_TOY_PRICE

    expect(store.playWithCat('cat-1')).toEqual({ success: true })
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
})
