import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CatHud from '@/components/CatHud.vue'
import { useCatStore } from '@/stores/cat'
import type { Cat } from '@/types/cat'

function cat(overrides: Partial<Cat>): Cat {
  return {
    id: 'cat', photoKey: '2妹-三花猫.jpg', name: '二妹', adoptedAt: 0,
    status: 'healthy', rarity: 'common', health: 100, affection: 100,
    hunger: 0, feedCount: 0, playCount: 0, lastLoginCheck: 0,
    ...overrides,
  }
}

describe('CatHud UI', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('summarizes collection, points, and care needs', () => {
    const store = useCatStore()
    store.points = 88
    store.cats = [cat({ id: 'healthy' }), cat({ id: 'sick', status: 'sick', health: 20 })]

    const wrapper = mount(CatHud)

    expect(wrapper.attributes('aria-label')).toBe('猫咖状态')
    expect(wrapper.text()).toContain('2只猫咪')
    expect(wrapper.text()).toContain('88积分')
    expect(wrapper.text()).toContain('1待照护')
    expect(wrapper.text()).toContain('14%图鉴')
  })
})
