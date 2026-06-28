import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CatAvatar from '@/components/CatAvatar.vue'

describe('CatAvatar UI', () => {
  it('uses the dedicated Huanu photo with accessible text', () => {
    const wrapper = mount(CatAvatar, { props: { size: 'large' } })
    const image = wrapper.get('img')

    expect(image.attributes('src')).toContain('cat-avatar-huanu.jpg')
    expect(image.attributes('alt')).toContain('花奴')
    expect(wrapper.get('.cat-avatar').classes()).toContain('cat-avatar-large')
  })
})
