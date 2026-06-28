/**
 * Cat Café — cat data model types
 * Adopted from cat_study_english Word Cat Café design docs
 *
 * @see cat_study_english/design/gdd/cat-adoption.md
 * @see cat_study_english/design/gdd/cat-state-management.md
 */

/** Cat health status — simplified 4-state model for Web App */
export type CatStatus = 'healthy' | 'sick' | 'runaway' | 'deceased'

/** A single adopted cat */
export interface Cat {
  /** Unique ID (nanoid) */
  id: string
  /** Photo filename key (maps to src/assets/img/cat-photos/) */
  photoKey: string
  /** Display name — user-editable, defaults to cat's Chinese name */
  name: string
  /** When this cat was adopted (unix timestamp ms) */
  adoptedAt: number
  /** Current health status */
  status: CatStatus
  /** Health: 0-100, 0 triggers sick, stays 0 for deceased */
  health: number
  /** Affection: 0-100, <60 can trigger runaway on login check */
  affection: number
  /** Hunger: 0-100 — higher = hungrier. 50+ starts draining health */
  hunger: number
  /** Total feed count */
  feedCount: number
  /** Total play count */
  playCount: number
  /** When last login check happened (for offline decay calc) */
  lastLoginCheck: number
}

/** Cat photo registry — all 7 cats */
export interface CatPhotoEntry {
  /** Filename in cat-photos/ */
  key: string
  /** Chinese display name */
  name: string
  /** Breed description */
  breed: string
}

/** All available cat photos */
export const CAT_PHOTOS: CatPhotoEntry[] = [
  { key: '2妹-三花猫.jpg',       name: '二妹', breed: '三花猫 · Calico' },
  { key: '一妹-三花猫.jpg',       name: '一妹', breed: '三花猫 · Calico' },
  { key: '一弟-猫头鹰.jpg',       name: '一弟', breed: '昵称"猫头鹰" · Owl' },
  { key: '三妹-三花猫.jpg',       name: '三妹', breed: '三花猫 · Calico' },
  { key: '二弟-蓝短猫.jpg',       name: '二弟', breed: '英国短毛猫（蓝色）· British Shorthair Blue' },
  { key: '花奴-三花猫.jpg',       name: '花奴', breed: '三花猫 · Calico' },
  { key: '三弟-穿绿衣服的粽子狸花猫.jpg', name: '三弟', breed: '狸花猫(穿绿衣服) · Tabby in Green Outfit' },
]

/** Cat food price in points */
export const CAT_FOOD_PRICE = 20
/** Cat toy price in points */
export const CAT_TOY_PRICE = 50
/** Points per correct answer (base) */
export const BASE_POINTS_PER_WORD = 1
/** Max speed bonus per word */
export const SPEED_BONUS_CAP = 10
/** Max answer time per word (ms) */
export const MAX_TIME_MS = 30000

/** Cat health thresholds */
export const SICK_HEALTH_THRESHOLD = 30
export const DECEASED_HEALTH_THRESHOLD = 0
export const MAX_HEALTH = 100
export const MAX_AFFECTION = 100
export const MAX_HUNGER = 100

/** Affection threshold for runaway check */
export const RUNAWAY_AFFECTION_THRESHOLD = 60

/** Hunger threshold — above this, health starts draining */
export const HUNGER_HEALTH_DRAIN_THRESHOLD = 50

/** Interaction effects */
export const FEED_HUNGER_REDUCTION = 10
export const PLAY_AFFECTION_GAIN = 5
export const PLAY_HEALTH_GAIN = 1
export const PET_AFFECTION_GAIN = 1

/** Persistence key in idb-keyval */
export const CAT_STORE_DB_KEY = 'cat-cafe-data'

/**
 * Calculate points earned for a correct answer.
 * F1 from points-economy.md:
 *   points = base_points + speed_bonus
 *   speed_bonus = min(cap, max(0, floor((max_time - time_taken) / 1000)))
 */
export function calculatePointsEarned(timeTakenMs: number): number {
  const bonus = Math.min(
    SPEED_BONUS_CAP,
    Math.max(0, Math.floor((MAX_TIME_MS - timeTakenMs) / 1000)),
  )
  return BASE_POINTS_PER_WORD + bonus
}
