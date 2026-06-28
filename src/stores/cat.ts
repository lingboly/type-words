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
import type { Cat, CatPhotoEntry, CatStatus } from '@/types/cat'
import {
  CAT_PHOTOS,
  CAT_STORE_DB_KEY,
  CAT_FOOD_PRICE,
  CAT_TOY_PRICE,
  FEED_HUNGER_REDUCTION,
  PLAY_AFFECTION_GAIN,
  PLAY_HEALTH_GAIN,
  PET_AFFECTION_GAIN,
  MAX_HEALTH,
  MAX_AFFECTION,
  MAX_HUNGER,
  SICK_HEALTH_THRESHOLD,
  RUNAWAY_AFFECTION_THRESHOLD,
  HUNGER_HEALTH_DRAIN_THRESHOLD,
} from '@/types/cat'

export interface CatStoreState {
  /** All adopted cats (alive or dead) */
  cats: Cat[]
  /** Total points */
  points: number
  /** Perfect game streak count */
  perfectGames: number
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
        c.status === 'sick' || c.hunger >= HUNGER_HEALTH_DRAIN_THRESHOLD,
      ).length
    },

    /** Number of runaway cats */
    runawayCatCount(): number {
      return this.aliveCats.filter(c => c.status === 'runaway').length
    },

    /** Number of deceased cats */
    deceasedCatCount(): number {
      return state.cats.filter(c => c.status === 'deceased').length
    },

    /** Newly adopted cat (for notification/anim) */
    newAdoptedCat(): Cat | null {
      if (!state.newAdoptedCatId) return null
      return state.cats.find(c => c.id === state.newAdoptedCatId) ?? null
    },

    /** Can afford a specific amount */
    canAfford(): (amount: number) => boolean {
      return (amount: number) => state.points >= amount
    },

    /** Cats that have reached max hunger */
    maxHungerCats(): Cat[] {
      return this.aliveCats.filter(c => c.hunger >= MAX_HUNGER)
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
          if (Array.isArray(data.cats)) this.cats = data.cats
          if (typeof data.points === 'number') this.points = data.points
          if (typeof data.perfectGames === 'number') this.perfectGames = data.perfectGames
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
      const ownedKeys = new Set(this.aliveCats.map(c => c.photoKey))
      const available = CAT_PHOTOS.filter(p => !ownedKeys.has(p.key))
      // If all owned, allow duplicates
      const pool = available.length > 0 ? available : CAT_PHOTOS
      const chosen: CatPhotoEntry = pool[Math.floor(Math.random() * pool.length)]

      const cat: Cat = {
        id: nanoid(),
        photoKey: chosen.key,
        name: chosen.name,
        adoptedAt: Date.now(),
        status: 'healthy',
        health: MAX_HEALTH,
        affection: MAX_AFFECTION,
        hunger: 0,
        feedCount: 0,
        playCount: 0,
        lastLoginCheck: Date.now(),
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
        if (cat.health <= 0 && cat.status !== 'icu' as CatStatus) {
          cat.status = 'sick'
        }
        if (cat.health < SICK_HEALTH_THRESHOLD && cat.status === 'healthy') {
          cat.status = 'sick'
        }

        // Runaway check when affection < 60
        if (cat.status !== 'runaway' && cat.affection < RUNAWAY_AFFECTION_THRESHOLD) {
          const runawayProb = Math.max(0, (RUNAWAY_AFFECTION_THRESHOLD - cat.affection) / RUNAWAY_AFFECTION_THRESHOLD * 0.3)
          if (Math.random() < runawayProb) {
            cat.status = 'runaway'
          }
        }

        cat.lastLoginCheck = now
      }
      this.persist()
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
    feedCat(catId: string): { success: boolean; reason?: string } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, reason: 'Cat not found' }
      if (cat.status === 'deceased') return { success: false, reason: 'Cat has passed away' }
      if (cat.status === 'runaway') return { success: false, reason: 'Cat has run away' }

      if (!this.spendPoints(CAT_FOOD_PRICE)) {
        return { success: false, reason: `Not enough points! Need ${CAT_FOOD_PRICE} points` }
      }

      cat.hunger = Math.max(0, cat.hunger - FEED_HUNGER_REDUCTION)
      cat.feedCount++

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

      // Recover from runaway: feed hungry runaway cat
      if (cat.status === 'runaway') {
        cat.health = Math.min(MAX_HEALTH, cat.health + 2)
      }

      this.persist()
      return { success: true }
    },

    /**
     * Play with a cat using a toy.
     * Cost: 50 points, effect: affection +5, health +1.
     */
    playWithCat(catId: string): { success: boolean; reason?: string } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, reason: 'Cat not found' }
      if (cat.status === 'deceased') return { success: false, reason: 'Cat has passed away' }
      if (cat.status === 'runaway') return { success: false, reason: 'Cat has run away' }
      if (cat.status === 'sick') return { success: false, reason: 'Cat is too weak to play' }

      if (!this.spendPoints(CAT_TOY_PRICE)) {
        return { success: false, reason: `Not enough points! Need ${CAT_TOY_PRICE} points` }
      }

      cat.affection = Math.min(MAX_AFFECTION, cat.affection + PLAY_AFFECTION_GAIN)
      cat.health = Math.min(MAX_HEALTH, cat.health + PLAY_HEALTH_GAIN)
      cat.playCount++
      this.persist()
      return { success: true }
    },

    /**
     * Pet a cat (free).
     * Effect: affection +1 per pet.
     */
    petCat(catId: string): { success: boolean; affectionGain: number } {
      const cat = this.getCatById(catId)
      if (!cat) return { success: false, affectionGain: 0 }
      if (cat.status === 'deceased') return { success: false, affectionGain: 0 }
      if (cat.status === 'runaway') return { success: false, affectionGain: 0 }

      // Sick/ICU cats get reduced effect
      const gain = cat.status === 'sick' ? Math.floor(PET_AFFECTION_GAIN / 2) : PET_AFFECTION_GAIN
      cat.affection = Math.min(MAX_AFFECTION, cat.affection + gain)
      this.persist()
      return { success: true, affectionGain: gain }
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
        return this.adoptCat()
      }
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
      this.lastGameAccuracy = 0
      this.newAdoptedCatId = null
      this.persist()
    },
  },
})
