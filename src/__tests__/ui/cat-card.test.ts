import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CatCard from '@/components/CatCard.vue'
import type { Cat } from '@/types/cat'

const cat: Cat = {
  id: 'cat-1',
  photoKey: '2妹-三花猫.jpg',
  name: '二妹',
  adoptedAt: 0,
  status: 'healthy',
  rarity: 'rare',
  health: 82,
  affection: 74,
  hunger: 35,
  feedCount: 2,
  playCount: 3,
  lastLoginCheck: 0,
}

describe('CatCard UI', () => {
  it('renders an accessible interactive card with status and values', () => {
    const wrapper = mount(CatCard, {
      props: {
        cat,
        photoUrl: '/cat.jpg',
        breed: 'Calico',
      },
    })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.get('img').attributes('alt')).toBe('二妹')
    expect(wrapper.text()).toContain('😺 健康')
    expect(wrapper.text()).toContain('稀有')
    expect(wrapper.text()).toContain('Calico')
    expect(wrapper.find('.health').attributes('style')).toContain('82%')
    expect(wrapper.find('.hunger').attributes('style')).toContain('65%')
    expect(wrapper.find('.affection').attributes('style')).toContain('74%')
  })

  it('shows new and sick visual states without losing the cat name', () => {
    const wrapper = mount(CatCard, {
      props: {
        cat: { ...cat, status: 'sick' },
        photoUrl: '/cat.jpg',
        breed: 'Calico',
        isNew: true,
      },
    })

    expect(wrapper.classes()).toContain('status-sick')
    expect(wrapper.classes()).toContain('is-new')
    expect(wrapper.text()).toContain('🆕 新伙伴！')
    expect(wrapper.text()).toContain('🤒 生病')
    expect(wrapper.get('img').classes()).toContain('grayscale')
  })

  it('shows ICU state with a visible non-color label', () => {
    const wrapper = mount(CatCard, {
      props: {
        cat: { ...cat, status: 'icu', health: 0 },
        photoUrl: '/cat.jpg',
        breed: 'Calico',
      },
    })

    expect(wrapper.classes()).toContain('status-icu')
    expect(wrapper.text()).toContain('🏥 抢救中')
  })
})
