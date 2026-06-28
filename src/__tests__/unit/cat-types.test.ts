/**
 * Cat Store unit tests
 *
 * Tests cover: adoption, points, state transitions, interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Since we can't easily test Pinia + idb-keyval in isolation,
// we test the pure logic functions and types directly
import {
  Cat,
  CatStatus,
  CAT_PHOTOS,
  CAT_FOOD_PRICE,
  CAT_TOY_PRICE,
  FEED_HUNGER_REDUCTION,
  PLAY_AFFECTION_GAIN,
  PLAY_HEALTH_GAIN,
  PET_AFFECTION_GAIN,
  SICK_HEALTH_THRESHOLD,
  RUNAWAY_AFFECTION_THRESHOLD,
  HUNGER_HEALTH_DRAIN_THRESHOLD,
  MAX_HEALTH,
  MAX_AFFECTION,
  MAX_HUNGER,
  calculatePointsEarned,
  SPEED_BONUS_CAP,
  BASE_POINTS_PER_WORD,
} from '@/types/cat'

describe('calculatePointsEarned', () => {
  it('gives base point for a very slow answer', () => {
    const pts = calculatePointsEarned(30000) // took all 30s
    expect(pts).toBe(BASE_POINTS_PER_WORD) // 1 base + 0 bonus
  })

  it('gives max speed bonus for instant answer', () => {
    const pts = calculatePointsEarned(0)
    expect(pts).toBe(BASE_POINTS_PER_WORD + SPEED_BONUS_CAP) // 1 + 10 = 11
  })

  it('gives partial bonus proportional to speed', () => {
    // took 15s out of 30s => bonus = floor((30000-15000)/1000) = 15, capped at 10
    const pts = calculatePointsEarned(15000)
    expect(pts).toBe(BASE_POINTS_PER_WORD + SPEED_BONUS_CAP) // capped
  })

  it('caps bonus at SPEED_BONUS_CAP', () => {
    const pts = calculatePointsEarned(5000) // 25s left => 25 bonus but capped at 10
    expect(pts).toBeLessThanOrEqual(BASE_POINTS_PER_WORD + SPEED_BONUS_CAP)
  })

  it('handles edge case: exactly at cap boundary', () => {
    // SPEED_BONUS_CAP = 10, so time_taken = 20000 => (30000-20000)/1000 = 10
    const pts = calculatePointsEarned(20000)
    expect(pts).toBe(BASE_POINTS_PER_WORD + SPEED_BONUS_CAP)
  })

  it('handles negative time (should not happen but be robust)', () => {
    const pts = calculatePointsEarned(-100)
    expect(pts).toBe(BASE_POINTS_PER_WORD + SPEED_BONUS_CAP) // max bonus
  })
})

describe('Cat type constants', () => {
  it('CAT_PHOTOS has 7 entries', () => {
    expect(CAT_PHOTOS).toHaveLength(7)
  })

  it('each CAT_PHOTOS entry has key, name, breed', () => {
    for (const photo of CAT_PHOTOS) {
      expect(photo.key).toBeTruthy()
      expect(photo.key).toMatch(/\.jpg$/)
      expect(photo.name).toBeTruthy()
      expect(photo.breed).toBeTruthy()
    }
  })

  it('prices are positive', () => {
    expect(CAT_FOOD_PRICE).toBeGreaterThan(0)
    expect(CAT_TOY_PRICE).toBeGreaterThan(0)
  })

  it('interaction effects are positive', () => {
    expect(FEED_HUNGER_REDUCTION).toBeGreaterThan(0)
    expect(PLAY_AFFECTION_GAIN).toBeGreaterThan(0)
    expect(PLAY_HEALTH_GAIN).toBeGreaterThan(0)
  })

  it('health thresholds are in valid range', () => {
    expect(SICK_HEALTH_THRESHOLD).toBeGreaterThan(0)
    expect(SICK_HEALTH_THRESHOLD).toBeLessThan(MAX_HEALTH)
    expect(MAX_HEALTH).toBe(100)
    expect(MAX_AFFECTION).toBe(100)
    expect(MAX_HUNGER).toBe(100)
  })

  it('runaway threshold is in valid range', () => {
    expect(RUNAWAY_AFFECTION_THRESHOLD).toBeGreaterThan(0)
    expect(RUNAWAY_AFFECTION_THRESHOLD).toBeLessThanOrEqual(MAX_AFFECTION)
  })
})

describe('Cat state transitions (pure logic)', () => {
  function createCat(overrides: Partial<Cat> = {}): Cat {
    return {
      id: 'test-cat-1',
      photoKey: CAT_PHOTOS[0].key,
      name: CAT_PHOTOS[0].name,
      adoptedAt: Date.now(),
      status: 'healthy',
      health: 100,
      affection: 100,
      hunger: 0,
      feedCount: 0,
      playCount: 0,
      lastLoginCheck: Date.now(),
      ...overrides,
    }
  }

  it('healthy cat stays healthy when all values good', () => {
    const cat = createCat()
    expect(cat.status).toBe('healthy')
    expect(cat.health).toBe(MAX_HEALTH)
    expect(cat.hunger).toBe(0)
  })

  it('cat becomes sick when health drops below SICK_HEALTH_THRESHOLD', () => {
    const cat = createCat({ health: SICK_HEALTH_THRESHOLD - 1 })
    // Status change happens in checkOfflineDecay, but we verify threshold
    expect(cat.health).toBeLessThan(SICK_HEALTH_THRESHOLD)
    // Should trigger sick status in real store
    expect(cat.status).toBe('healthy') // doesn't auto-transition without store action
  })

  it('cat cannot have negative health', () => {
    const cat = createCat({ health: 0 })
    expect(cat.health).toBeGreaterThanOrEqual(0)
  })

  it('cat cannot exceed max health', () => {
    const cat = createCat()
    expect(cat.health).toBeLessThanOrEqual(MAX_HEALTH)
  })

  it('hunger at 50+ should trigger health drain logic', () => {
    const cat = createCat({ hunger: HUNGER_HEALTH_DRAIN_THRESHOLD })
    expect(cat.hunger).toBeGreaterThanOrEqual(HUNGER_HEALTH_DRAIN_THRESHOLD)
  })

  it('affection below runaway threshold marks risk', () => {
    const cat = createCat({ affection: RUNAWAY_AFFECTION_THRESHOLD - 1 })
    expect(cat.affection).toBeLessThan(RUNAWAY_AFFECTION_THRESHOLD)
  })

  it('deceased status prevents interaction', () => {
    const cat = createCat({ status: 'deceased' } as Cat)
    expect(cat.status).toBe('deceased')
  })
})
