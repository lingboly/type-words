/**
 * Cat Café — cat data model types
 * Adopted from cat_study_english Word Cat Café design docs
 *
 * @see cat_study_english/design/gdd/cat-adoption.md
 * @see cat_study_english/design/gdd/cat-state-management.md
 */

/** Cat health status adapted from the six-state cat care design. */
export type CatStatus = 'healthy' | 'sick' | 'icu' | 'runaway' | 'deceased'

export type CatRarity = 'common' | 'rare' | 'premium'

export type CatSupplyTier = 'basic' | 'premium'

/** Parent-managed balancing values from the Cat Café design documents. */
export interface CatTuning {
  hungerDecayPerHour: number
  affectionDecayPerHour: number
  healthDrainThreshold: number
  sickHealthThreshold: number
  runawayAffectionThreshold: number
  runawayMaxProbability: number
  icuDailyCost: number
  icuFailedDaysLimit: number
  runawayRecallDays: number
  communityHealStreak: number
  dailyPetLimit: number
  dailyPlayLimit: number
  basicFoodPrice: number
  premiumFoodPrice: number
  basicToyPrice: number
  luxuryToyPrice: number
  medicinePrice: number
  premiumMedicinePrice: number
}

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
  /** Collection rarity. Older saves are migrated to common. */
  rarity?: CatRarity
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
  /** Daily interaction counters. */
  interactionDate?: string
  dailyPetPoints?: number
  dailyPlayCount?: number
  /** Consecutive remote-care days used to recall runaway cats. */
  runawayFeedDate?: string
  runawayFeedStreak?: number
  /** ICU rescue accounting. */
  icuLastChargeDate?: string
  icuFailedDays?: number
}

/** Cat photo registry — all 7 cats */
export interface CatPhotoEntry {
  /** Filename in cat-photos/ */
  key: string
  /** Chinese display name */
  name: string
  /** Breed description */
  breed: string
  rarity: CatRarity
}

/** All available cat photos */
export const CAT_PHOTOS: CatPhotoEntry[] = [
  { key: '2妹-三花猫.jpg', name: '二妹', breed: '三花猫 · Calico', rarity: 'common' },
  { key: '一妹-三花猫.jpg', name: '一妹', breed: '三花猫 · Calico', rarity: 'common' },
  { key: '一弟-猫头鹰.jpg', name: '一弟', breed: '昵称"猫头鹰" · Owl', rarity: 'common' },
  { key: '三妹-三花猫.jpg', name: '三妹', breed: '三花猫 · Calico', rarity: 'common' },
  { key: '二弟-蓝短猫.jpg', name: '二弟', breed: '英国短毛猫（蓝色）· British Shorthair Blue', rarity: 'rare' },
  { key: '三弟-穿绿衣服的粽子狸花猫.jpg', name: '三弟', breed: '狸花猫(穿绿衣服) · Tabby in Green Outfit', rarity: 'rare' },
  { key: '花奴-三花猫.jpg', name: '花奴', breed: '三花猫 · Calico', rarity: 'premium' },
]

/** Cat food price in points */
export const CAT_FOOD_PRICE = 20
/** Cat toy price in points */
export const CAT_TOY_PRICE = 50
export const PREMIUM_CAT_FOOD_PRICE = 40
export const LUXURY_CAT_TOY_PRICE = 100
export const CAT_MEDICINE_PRICE = 30
export const PREMIUM_CAT_MEDICINE_PRICE = 50
export const ICU_DAILY_COST = 15
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
export const PREMIUM_FEED_HUNGER_REDUCTION = 20
export const PREMIUM_FEED_AFFECTION_GAIN = 2
export const PLAY_AFFECTION_GAIN = 5
export const PLAY_HEALTH_GAIN = 1
export const LUXURY_PLAY_AFFECTION_GAIN = 10
export const LUXURY_PLAY_HEALTH_GAIN = 2
export const MEDICINE_HEALTH_GAIN = 20
export const PREMIUM_MEDICINE_HEALTH_GAIN = 50
export const PET_AFFECTION_GAIN = 1
export const MAX_DAILY_PET_POINTS = 40
export const MAX_DAILY_PLAYS = 5
export const RUNAWAY_RECALL_DAYS = 7
export const COMMUNITY_HEAL_STREAK = 5

export const DEFAULT_CAT_TUNING: CatTuning = {
  hungerDecayPerHour: 25,
  affectionDecayPerHour: 1,
  healthDrainThreshold: HUNGER_HEALTH_DRAIN_THRESHOLD,
  sickHealthThreshold: SICK_HEALTH_THRESHOLD,
  runawayAffectionThreshold: RUNAWAY_AFFECTION_THRESHOLD,
  runawayMaxProbability: 30,
  icuDailyCost: ICU_DAILY_COST,
  icuFailedDaysLimit: 7,
  runawayRecallDays: RUNAWAY_RECALL_DAYS,
  communityHealStreak: COMMUNITY_HEAL_STREAK,
  dailyPetLimit: MAX_DAILY_PET_POINTS,
  dailyPlayLimit: MAX_DAILY_PLAYS,
  basicFoodPrice: CAT_FOOD_PRICE,
  premiumFoodPrice: PREMIUM_CAT_FOOD_PRICE,
  basicToyPrice: CAT_TOY_PRICE,
  luxuryToyPrice: LUXURY_CAT_TOY_PRICE,
  medicinePrice: CAT_MEDICINE_PRICE,
  premiumMedicinePrice: PREMIUM_CAT_MEDICINE_PRICE,
}

/** SHA-256 of the initial local-only parent password, 1234. */
export const DEFAULT_PARENT_PASSWORD_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'

export async function hashParentPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Persistence key in idb-keyval */
export const CAT_STORE_DB_KEY = 'cat-cafe-data'

export const CAT_RARITY_LABELS: Record<CatRarity, string> = {
  common: '普通',
  rare: '稀有',
  premium: '珍藏',
}

/** Weighted rarity roll for the Web app's available photo pool. */
export function rollCatRarity(totalCats: number, random = Math.random()): CatRarity {
  if (totalCats < 3) return 'common'
  const premiumWeight = totalCats >= 10 ? 0.08 : 0
  const rareWeight = 0.2
  if (random < premiumWeight) return 'premium'
  if (random < premiumWeight + rareWeight) return 'rare'
  return 'common'
}

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
