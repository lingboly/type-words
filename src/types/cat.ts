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
/** Initial health, satiety, and affection shown for every newly adopted cat. */
export const INITIAL_CAT_STAT = 50

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

/** SHA-256 fallback for browsers where Web Crypto is unavailable on plain HTTP. */
export function hashParentPasswordLocally(password: string): string {
  const constants = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ])
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])
  const bytes = new TextEncoder().encode(password)
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  const bitLength = bytes.length * 8
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000))
  view.setUint32(paddedLength - 4, bitLength)

  const words = new Uint32Array(64)
  const rotateRight = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount))

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4)
    for (let index = 16; index < 64; index++) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3)
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10)
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, h] = hash
    for (let index = 0; index < 64; index++) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const choice = (e & f) ^ (~e & g)
      const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (sum0 + majority) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    hash[0] = (hash[0] + a) >>> 0
    hash[1] = (hash[1] + b) >>> 0
    hash[2] = (hash[2] + c) >>> 0
    hash[3] = (hash[3] + d) >>> 0
    hash[4] = (hash[4] + e) >>> 0
    hash[5] = (hash[5] + f) >>> 0
    hash[6] = (hash[6] + g) >>> 0
    hash[7] = (hash[7] + h) >>> 0
  }

  return Array.from(hash, word => word.toString(16).padStart(8, '0')).join('')
}

export async function hashParentPassword(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    try {
      const digest = await subtle.digest('SHA-256', new TextEncoder().encode(password))
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    } catch {
      // Some embedded browsers expose SubtleCrypto but reject digest operations.
    }
  }
  return hashParentPasswordLocally(password)
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
