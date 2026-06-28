import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CatDetailDialog from '@/components/CatDetailDialog.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useCatStore } from '@/stores/cat'
import { CAT_FOOD_PRICE, type Cat } from '@/types/cat'

const cat: Cat = {
  id: 'cat-1', photoKey: '花奴-三花猫.jpg', name: '花奴', adoptedAt: 0,
  status: 'healthy', rarity: 'premium', health: 100, affection: 80,
  hunger: 40, feedCount: 0, playCount: 0, lastLoginCheck: 0,
}

describe('CatDetailDialog UI', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('requires confirmation before spending earned points', async () => {
    const store = useCatStore()
    store.cats = [{ ...cat }]
    store.points = CAT_FOOD_PRICE
    const wrapper = mount(CatDetailDialog, {
      props: { cat: store.cats[0] },
      global: {
        stubs: {
          Teleport: true,
          Tooltip: { template: '<div><slot /></div>' },
          IconEosIconsLoading: true,
        },
      },
    })

    wrapper.findAllComponents(BaseButton)[0].vm.$emit('click')
    await wrapper.vm.$nextTick()
    expect(store.points).toBe(CAT_FOOD_PRICE)
    expect(wrapper.text()).toContain('确认花费')

    await wrapper.get('.purchase-confirm .confirm').trigger('click')
    expect(store.points).toBe(0)
    expect(store.cats[0].hunger).toBe(30)
  })

  it('explains ICU care and disables play supplies', () => {
    const store = useCatStore()
    store.cats = [{ ...cat, status: 'icu', health: 0 }]
    const wrapper = mount(CatDetailDialog, {
      props: { cat: store.cats[0] },
      global: {
        stubs: {
          Teleport: true,
          Tooltip: { template: '<div><slot /></div>' },
          IconEosIconsLoading: true,
        },
      },
    })

    expect(wrapper.text()).toContain('正在 ICU 抢救')
    expect(wrapper.findAll('.action-btn.play').every(button => 'disabled' in button.attributes())).toBe(true)
  })
})
