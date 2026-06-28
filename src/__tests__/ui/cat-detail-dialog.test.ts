import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CatDetailDialog from '@/components/CatDetailDialog.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useCatStore } from '@/stores/cat'
import { CAT_FOOD_PRICE, PREMIUM_CAT_MEDICINE_PRICE, type Cat } from '@/types/cat'

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

    wrapper.findAllComponents(BaseButton).find(button => button.text().includes('基础猫粮'))?.vm.$emit('click')
    await wrapper.vm.$nextTick()
    expect(store.points).toBe(CAT_FOOD_PRICE)
    expect(wrapper.text()).toContain('确认花费')

    await wrapper.get('.purchase-confirm .confirm').trigger('click')
    expect(store.points).toBe(0)
    expect(store.cats[0].hunger).toBe(30)
  })

  it('plays for free and updates the daily interaction summary', async () => {
    const store = useCatStore()
    store.cats = [{ ...cat, health: 90, affection: 70, dailyPlayCount: 0 }]
    store.points = 0
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

    wrapper.findAllComponents(BaseButton).find(button => button.text().includes('开始玩耍'))?.vm.$emit('click')
    await wrapper.vm.$nextTick()

    expect(store.points).toBe(0)
    expect(store.cats[0]).toMatchObject({ health: 91, affection: 75, dailyPlayCount: 1, playCount: 1 })
    expect(wrapper.text()).toContain('玩得真开心！亲昵 +5，健康 +1')
    expect(wrapper.classes()).not.toContain('is-playing')
    expect(wrapper.get('.dialog-content').classes()).toContain('is-playing')
  })

  it('keeps the cat still and redirects to study after the daily play limit', async () => {
    const store = useCatStore()
    store.cats = [{
      ...cat,
      interactionDate: new Date().toISOString().slice(0, 10),
      dailyPlayCount: store.tuning.dailyPlayLimit,
    }]
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

    wrapper.findAllComponents(BaseButton).find(button => button.text().includes('开始玩耍'))?.vm.$emit('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.dialog-content').classes()).not.toContain('is-playing')
    expect(wrapper.find('.play-effect').exists()).toBe(false)
    expect(wrapper.text()).toContain('已经玩够了， 去学习吧')
    expect(wrapper.get('.feedback-msg').classes()).toContain('feedback-attention')
    expect(wrapper.get('.feedback-msg').attributes('role')).toBe('alert')
    expect(store.cats[0].dailyPlayCount).toBe(store.tuning.dailyPlayLimit)
  })

  it('shows renamed premium supplies and treats a cat below full health', async () => {
    const store = useCatStore()
    store.cats = [{ ...cat, health: 90 }]
    store.points = PREMIUM_CAT_MEDICINE_PRICE
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

    expect(wrapper.text()).toContain('美味猫粮 200分')
    expect(wrapper.text()).toContain('奢侈玩具 500分')
    expect(wrapper.text()).toContain('手术治疗 500分')
    const surgery = wrapper.findAllComponents(BaseButton).find(button => button.text().includes('手术治疗'))
    expect(surgery?.props('disabled')).toBe(false)
    surgery?.vm.$emit('click')
    await wrapper.vm.$nextTick()
    await wrapper.get('.purchase-confirm .confirm').trigger('click')

    expect(store.points).toBe(0)
    expect(store.cats[0].health).toBe(100)
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
