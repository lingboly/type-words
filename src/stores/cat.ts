/**
 * Cat Store — manages cat adoption, state, and interaction
 *
 * Persisted via idb-keyval (IndexedDB). All cat mutations are synchronous
 * on the in-memory state and async-persisted to IndexedDB.
 *
 * @see cat_study_english/design/gdd/cat-adoption.md
 * @see cat_study_english/design/gdd/cat-state-management.md
 * @see cat_study_english/design/gdd/cat-interaction.md
 * @see cat_study_english/design/gdd/points-economy.md
 */

import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { nanoid } from 'nanoid'
import type { Cat, CatPhotoEntry, CatSupplyTier } from '@/types/cat'
import {
  CAT_PHOTOS,
  CAT_STORE_DB_KEY,
  CAT_FOOD_PRICE,
  CAT_TOY_PRICE,
  CAT_MEDICINE_PRICE,
  COMMUNITY_HEAL_STREAK,
  FEED_HUNGER_REDUCTION,
  ICU_DAILY_COST,
  LUXURY_CAT_TOY_PRICE,
  LUXURY_PLAY_AFFECTION_GAIN,
  LUXURY_PLAY_HEALTH_GAIN,
  MAX_DAILY_PET_POINTS,
  MAX_DAILY_PLAYS,
  MEDICINE_HEALTH_GAIN,
  PREMIUM_CAT_FOOD_PRICE,
  PREMIUM_CAT_MEDICINE_PRICE,
  PREMIUM_FEED_AFFECTION_GAIN,
  PREMIUM_FEED_HUNGER_REDUCTION,
  PREMIUM_MEDICINE_HEALTH_GAIN,
  RUNAWAY_RECALL_DAYS,
  PLAY_AFFECTION_GAIN,
  PLAY_HEALTH_GAIN,
  PET_AFFECTION_GAIN,
  MAX_HEALTH,
  MAX_AFFECTION,
  MAX_HUNGER,
  SICK_HEALTH_THRESHOLD,
  RUNAWAY_AFFECTION_THRESHOLD,
  HUNGER_HEALTH_DRAIN_THRESHOLD,
  rollCatRarity,
} from '@/types/cat'

function dateKey(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00Z`).getTime()
  const toTime = new Date(`${to}T00:00:00Z`).getTime()
  return Math.round((toTime - fromTime) / 86_400_000)
}

function migrateCat(cat: Cat): Cat {
  return {
    ...cat,
    rarity: cat.rarity ?? CAT_PHOTOS.find(photo => photo.key === cat.photoKey)?.rarity ?? 'common',
    interactionDate: cat.interactionDate ?? dateKey(),
    dailyPetPoints: cat.dailyPetPoints ?? 0,
    dailyPlayCount: cat.dailyPlayCount ?? 0,
    runawayFeedStreak: cat.runawayFeedStreak ?? 0,
    icuFailedDays: cat.icuFailedDays ?? 0,
  }
}

export interface CatStoreState {
  /** All adopted cats (alive or dead) */
  cats: Cat[]
  /** Total points */
  points: number
  /** Perfect game streak count */
  perfectGames: number
  /** Current consecutive perfect-session streak. */
  perfectStreak: number
  /** Number of community-heal celebrations triggered. */
  communityHealCount: number
  /** Last game accuracy (0-1) */
  lastGameAccuracy: number
  /** Global cat feature toggle */
  catEnabled: boolean
  /** Whether cat companion is shown during practice */
  showPracticeCompanion: boolean
  /** Whether animations should play */
  showAnimations: boolean
  /** Newly adopted cat ID (for notification) */
  newAdoptedCatId: string | null
  /** Whether data has been loaded from IndexedDB */
  loaded: boolean
}

export const useCatStore = defineStore('cat', {
  state: (): CatStoreState => ({
    cats: [],
    points: 0,
    perfectGames: 0,
    perfectStreak: 0,
    communityHealCount: 0,
    lastGameAccuracy: 0,
    catEnabled: true,
    showPracticeCompanion: true,
    showAnimations: true,
    newAdoptedCatId: null,
    loaded: false,
  }),

  getters: {
    /** Alive cats only */
    aliveCats(state): Cat[] {
      return state.cats.filter(c => c.status !== 'deceased')
    },

    /** Number of alive cats */
    catCount(): number {
      return this.aliveCats.length
    },

    /** Number of cats that need attention (sick or hungry) */
    warningCatCount(): number {
      return this.aliveCats.filter(c =>
        c.status === 'sick' || c.status === 'icu' || c.hunger >= HUNGER_HEALTH_DRAIN_THRESHOLD,
      ).length
    },

    /** Number of runaway cats */
    runawayCatCount(): number {
      return this.aliveCats.filter(c => c.status === 'runaway').length
    },

    /** Number of deceased cats */
    deceasedCatCount(state): number {
      return state.cats.filter(c => c.status === 'deceased').length
    },

    /** Newly adopted cat (for notification/anim) */
    newAdoptedCat(state): Cat | null {
      if (!state.newAdoptedCatId) return null
      return state.cats.find(c => c.id === state.newAdoptedCatId) ?? null
    },

    /** Can afford a specific amount */
    canAfford(state): (amount: number) => boolean {
      return (amount: number) => state.points >= amount
    },

    /** Cats that have reached max hunger */
    maxHungerCats(): Cat[] {
      return this.aliveCats.filter(c => c.hunger >= MAX_HUNGER)
    },

    /** Cats physically present in the café. */
    cafeCats(): Cat[] {
      return this.aliveCats.filter(c => c.status !== 'runaway')
    },

    rarityCounts(state): Record<string, number> {
      return state.cats.reduce((result, cat) => {
        const rarity = cat.rarity ?? 'common'
        result[rarity] = (result[rarity] ?? 0) + 1
        return result
      }, { common: 0, rare: 0, premium: 0 } as Record<string, number>)
    },

    collectionProgress(state): number {
      const collected = new Set(state.cats.map(cat => cat.photoKey)).size
      return Math.round((collected / CAT_PHOTOS.length) * 100)
    },
  },

  actions: {
    // ===== Persistence =====

    /** Load cat data from IndexedDB */
    async loadFromStorage() {
      if (this.loaded) return // already loaded
      try {
        const raw = await idbGet(CAT_STORE_DB_KEY)
        if (raw && typeof raw === 'object') {
          const data = raw as Partial<CatStoreState>
          if (Array.isArray(data.cats)) this.cats = data.cats.map(migrateCat)
          if (typeof data.points === 'number') this.points = data.points
          if (typeof data.perfectGames === 'number') this.perfectGames = data.perfectGames
          if (typeof data.perfectStreak === 'number') this.perfectStreak = data.perfectStreak
          if (typeof data.communityHealCount === 'number') this.communityHealCount = data.communityHealCount
          if (typeof data.lastGameAccuracy === 'number') this.lastGameAccuracy = data.lastGameAccuracy
          if (typeof data.catEnabled === 'boolean') this.catEnabled = data.catEnabled
          if (typeof data.showPracticeCompanion === 'boolean') this.showPracticeCompanion = data.showPracticeCompanion
          if (typeof data.showAnimations === 'boolean') this.showAnimations = data.showAnimations
        }
      } catch {
        // IndexedDB unavailable — use in-memory defaults
      }
      this.loaded = true
      // Check for offline decay on load
      this.checkOfflineDecay()
    },

    /** Persist current state to IndexedDB */
    async persist() {
      try {
        const data: Partial<CatStoreState> = {
          cats: this.cats,
          points: this.points,
          perfectGames: this.perfectGames,
          perfectStreak: this.perfectStreak,
          communityHealCount: this.communityHealCount,
          lastGameAccuracy: this.lastGameAccuracy,
          catEnabled: this.catEnabled,
          showPracticeCompanion: this.showPracticeCompanion,
          showAnimations: this.showAnimations,
        }
        await idbSet(CAT_STORE_DB_KEY, data)
      } catch {
        // IndexedDB write failed — data stays in memory
      }
    },

    // ===== Points =====

    /** Add points after a correct answer */
    addPoints(amount: number) {
      this.points += amount
      this.persist()
    },

    /** Spend points — returns false if cannot afford */
    spendPoints(amount: number): boolean {
      if (this.points < amount) return false
      this.points -= amount
      this.persist()
      return true
    },

    // ===== Adoption =====

    /**
     * Randomly adopt a new cat.
     * Prefers un-owned photos; after all 7 collected, allows duplicates.
     * Returns the new Cat object.
     */
    adoptCat(): Cat {
      const rarity = rollCatRarity(this.cats.length)
      const ownedKeys = new Set(this.aliveCats.map(c => c.photoKey))
      const rarityPool = CAT_PHOTOS.filter(photo => photo.rarity === rarity)
      const available = rarityPool.filter(p => !ownedKeys.has(p.key))
      // If all owned, allow duplicates
      const pool = available.length > 0 ? available : rarityPool.length > 0 ? rarityPool : CAT_PHOTOS
      const chosen: CatPhotoEntry = pool[Math.floor(Math.random() * pool.length)]

      const cat: Cat = {
        id: nanoid(),
        photoKey: chosen.key,
        name: chosen.name,
        adoptedAt: Date.now(),
        status: 'healthy',
        rarity: chosen.rarity,
        health: MAX_HEALTH,
        affection: MAX_AFFECTION,
        hunger: 0,
        feedCount: 0,
        playCount: 0,
        lastLoginCheck: Date.now(),
        interactionDate: dateKey(),
        dailyPetPoints: 0,
        dailyPlayCount: 0,
        runawayFeedStreak: 0,
        icuFailedDays: 0,
      }

      this.cats.push(cat)
      this.perfectGames++
      this.newAdoptedCatId = cat.id
      this.persist()
      return cat
    },

    /** Clear the new-adopted notification marker */
    clearNewAdopted() {
      this.newAdoptedCatId = null
      this.persist()
    },

    // ===== Cat State Management =====

    /**
     * Check offline decay on login.
     * For each alive cat, calculate hours since lastLoginCheck and apply
     * hunger/health decay proportional to elapsed time.
     */
    checkOfflineDecay() {
      const now = Date.now()
      for (const cat of this.aliveCats) {
        if (cat.status === 'deceased') continue

        if (cat.status === 'icu') {
          this.processIcuCharges(cat, now)
          cat.lastLoginCheck = now
          continue
        }

        const elapsedHours = (now - cat.lastLoginCheck) / (1000 * 60 * 60)

        // Skip if less than 1 hour
        if (elapsedHours < 1) {
          cat.lastLoginCheck = now
          continue
        }

        // Hunger increases by 25/hour (capped at 100)
        cat.hunger = Math.min(MAX_HUNGER, cat.hunger + Math.floor(elapsedHours * 25))

        // Health drains when hunger > 50
        if (cat.hunger > HUNGER_HEALTH_DRAIN_THRESHOLD) {
          const drainRate = ((cat.hunger - HUNGER_HEALTH_DRAIN_THRESHOLD) / 50) * 1.0
          const healthLoss = Math.floor(elapsedHours * drainRate)
          cat.health = Math.max(0, cat.health - healthLoss)
        }

        // Status transitions
        if (cat.health <= 0) {
          cat.status = 'icu'
          cat.icuLastChargeDate = dateKey(now)
          cat.icuFailedDays = 0
        }
        if (cat.health < SICK_HEALTH_THRESHOLD && cat.status === 'healthy') {
          cat.status = 'sick'
        }

        // Runaway check when affection < 60
        if ((cat.status === 'healthy' || cat.status === 'sick') && cat.affection < RUNAWAY_AFFECTION_THRESHOLD) {
          const runawayProb = Math.max(0, (RUNAWAY_AFFECTION_THRESHOLD - cat.affection) / RUNAWAY_AFFECTION_THRESHOLD * 0.3)
          if (Math.random() < runawayProb) {
            cat.status = 'runaway'
          }
        }

        cat.lastLoginCheck = now
      }
      this.persist()
    },

    processIcuCharges(cat: Cat, now = Date.now()) {
      const today = dateKey(now)
      const lastCharge = cat.icuLastChargeDate ?? today
      const dueDays = Math.max(0, daysBetween(lastCharge, today))
      for (let day = 0; day < dueDays; day++) {
        if (this.points >= ICU_DAILY_COST) {
          this.points -= ICU_DAILY_COST
          cat.icuFailedDays = 0
        } else {
          cat.icuFailedDays = (cat.icuFailedDays ?? 0) + 1
          if (cat.icuFailedDays >= 7) {
            cat.status = 'deceased'
            break
          }
        }
      }
      cat.icuLastChargeDate = today
    },

    resetDailyInteraction(cat: Cat, now = Date.now()) {
      const today = dateKey(now)
      if (cat.interactionDate !== today) {
        cat.interactionDate = today
        cat.dailyPetPoints = 0
        cat.dailyPlayCount = 0
      }
    },

    /** Get cat by ID */
    getCatById(id: string): Cat | undefined {
      return this.cats.find(c => c.id === id)
    },

    // ===== Cat Interaction =====

    /**
     * Feed a cat with basic food.
     * Cost: 20 points, effect: hunger -10.
     */
    feedCat(catId: string, tier: CatSupplyTier = 'basic'): { success: boolean; reason?: string; recalled?: boolean } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, reason: '没有找到这只猫咪' }
      if (cat.status === 'deceased') return { success: false, reason: '这只猫咪已经离开了' }
      if (cat.status === 'icu') return { success: false, reason: 'ICU 中请先使用医疗用品' }

      const price = tier === 'premium' ? PREMIUM_CAT_FOOD_PRICE : CAT_FOOD_PRICE
      if (!this.spendPoints(price)) {
        return { success: false, reason: `积分不足，需要 ${price} 积分` }
      }

      const reduction = tier === 'premium' ? PREMIUM_FEED_HUNGER_REDUCTION : FEED_HUNGER_REDUCTION
      cat.hunger = Math.max(0, cat.hunger - reduction)
      if (tier === 'premium') {
        cat.affection = Math.min(MAX_AFFECTION, cat.affection + PREMIUM_FEED_AFFECTION_GAIN)
      }
      cat.feedCount++

      if (cat.status === 'runaway') {
        const today = dateKey()
        if (cat.runawayFeedDate !== today) {
          const gap = cat.runawayFeedDate ? daysBetween(cat.runawayFeedDate, today) : 1
          cat.runawayFeedStreak = gap === 1 ? (cat.runawayFeedStreak ?? 0) + 1 : 1
          cat.runawayFeedDate = today
        }
        if ((cat.runawayFeedStreak ?? 0) >= RUNAWAY_RECALL_DAYS) {
          cat.status = 'healthy'
          cat.affection = 50
          cat.runawayFeedStreak = 0
          this.persist()
          return { success: true, recalled: true }
        }
        this.persist()
        return { success: true, recalled: false }
      }

      // If hunger drops below 50 and cat was sick, begin recovery
      if (cat.hunger < HUNGER_HEALTH_DRAIN_THRESHOLD && cat.status === 'sick' && cat.health >= SICK_HEALTH_THRESHOLD) {
        cat.status = 'healthy'
      }

      // Feeding helps sick cats recover slightly
      if (cat.status === 'sick') {
        cat.health = Math.min(MAX_HEALTH, cat.health + 2)
        if (cat.health >= SICK_HEALTH_THRESHOLD) {
          cat.status = 'healthy'
        }
      }

      this.persist()
      return { success: true }
    },

    /**
     * Play with a cat using a toy.
     * Cost: 50 points, effect: affection +5, health +1.
     */
    playWithCat(catId: string, tier: CatSupplyTier = 'basic'): { success: boolean; reason?: string; affectionGain?: number; healthGain?: number } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, reason: '没有找到这只猫咪' }
      if (cat.status === 'deceased') return { success: false, reason: '这只猫咪已经离开了' }
      if (cat.status === 'runaway') return { success: false, reason: '猫咪还在外面，请先远程照护召回' }
      if (cat.status === 'sick' || cat.status === 'icu') return { success: false, reason: '猫咪身体虚弱，暂时不能玩耍' }

      this.resetDailyInteraction(cat)
      if ((cat.dailyPlayCount ?? 0) >= MAX_DAILY_PLAYS) {
        return { success: false, reason: '今天已经玩累了，明天再来吧' }
      }

      const price = tier === 'premium' ? LUXURY_CAT_TOY_PRICE : CAT_TOY_PRICE
      if (!this.spendPoints(price)) {
        return { success: false, reason: `积分不足，需要 ${price} 积分` }
      }

      const affectionGain = tier === 'premium' ? LUXURY_PLAY_AFFECTION_GAIN : PLAY_AFFECTION_GAIN
      const healthGain = tier === 'premium' ? LUXURY_PLAY_HEALTH_GAIN : PLAY_HEALTH_GAIN
      cat.affection = Math.min(MAX_AFFECTION, cat.affection + affectionGain)
      cat.health = Math.min(MAX_HEALTH, cat.health + healthGain)
      cat.playCount++
      cat.dailyPlayCount = (cat.dailyPlayCount ?? 0) + 1
      this.persist()
      return { success: true, affectionGain, healthGain }
    },

    /**
     * Pet a cat (free).
     * Effect: affection +1 per pet.
     */
    petCat(catId: string): { success: boolean; affectionGain: number; reason?: string } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, affectionGain: 0 }
      if (cat.status === 'deceased') return { success: false, affectionGain: 0 }
      if (cat.status === 'runaway') return { success: false, affectionGain: 0 }

      this.resetDailyInteraction(cat)
      if ((cat.dailyPetPoints ?? 0) >= MAX_DAILY_PET_POINTS) {
        return { success: false, affectionGain: 0, reason: '今天已经摸够了，明天再来吧' }
      }

      // Sick/ICU cats get reduced effect
      const gain = cat.status === 'icu' ? Math.floor(PET_AFFECTION_GAIN / 2) : PET_AFFECTION_GAIN
      cat.affection = Math.min(MAX_AFFECTION, cat.affection + gain)
      cat.dailyPetPoints = (cat.dailyPetPoints ?? 0) + gain
      this.persist()
      return { success: true, affectionGain: gain }
    },

    healCat(catId: string, tier: CatSupplyTier = 'basic'): { success: boolean; reason?: string; healthGain?: number } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, reason: '没有找到这只猫咪' }
      if (cat.status === 'deceased') return { success: false, reason: '这只猫咪已经离开，无法治疗' }
      if (cat.status !== 'sick' && cat.status !== 'icu') return { success: false, reason: '健康猫咪不需要用药' }

      const price = tier === 'premium' ? PREMIUM_CAT_MEDICINE_PRICE : CAT_MEDICINE_PRICE
      if (!this.spendPoints(price)) return { success: false, reason: `积分不足，需要 ${price} 积分` }
      const healthGain = tier === 'premium' ? PREMIUM_MEDICINE_HEALTH_GAIN : MEDICINE_HEALTH_GAIN
      cat.health = Math.min(MAX_HEALTH, cat.health + healthGain)
      cat.status = 'healthy'
      cat.icuFailedDays = 0
      this.persist()
      return { success: true, healthGain }
    },

    healCommunity(): number {
      let healed = 0
      for (const cat of this.cats) {
        if (cat.status === 'healthy' || cat.status === 'sick') {
          cat.health = MAX_HEALTH
          cat.status = 'healthy'
          healed++
        }
      }
      this.communityHealCount++
      this.persist()
      return healed
    },

    // ===== Game Session =====

    /**
     * Record a game session result.
     * Called from Statistics.vue when a practice session completes.
     */
    recordGameSession(accuracy: number, totalCorrect: number, totalQuestions: number) {
      this.lastGameAccuracy = accuracy

      // Only adopt on perfect score (accuracy === 1.0)
      if (accuracy >= 1.0 && totalCorrect === totalQuestions && totalQuestions > 0) {
        this.perfectStreak++
        const cat = this.adoptCat()
        if (this.perfectStreak >= COMMUNITY_HEAL_STREAK) {
          this.healCommunity()
          this.perfectStreak = 0
        }
        return cat
      }
      this.perfectStreak = 0
      this.persist()
      return null
    },

    // ===== Settings =====

    /** Toggle global cat feature */
    toggleCatEnabled() {
      this.catEnabled = !this.catEnabled
      this.persist()
    },

    /** Toggle practice companion display */
    togglePracticeCompanion() {
      this.showPracticeCompanion = !this.showPracticeCompanion
      this.persist()
    },

    /** Toggle animations */
    toggleAnimations() {
      this.showAnimations = !this.showAnimations
      this.persist()
    },

    /** Reset all cat data (destructive, requires confirmation) */
    resetAllData() {
      this.cats = []
      this.points = 0
      this.perfectGames = 0
      this.perfectStreak = 0
      this.communityHealCount = 0
      this.lastGameAccuracy = 0
      this.newAdoptedCatId = null
      this.persist()
    },
  },
})
