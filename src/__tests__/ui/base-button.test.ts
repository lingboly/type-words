import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/BaseButton.vue'

const global = {
  stubs: {
    Tooltip: { template: '<div><slot /></div>' },
    IconEosIconsLoading: { template: '<span data-test="loading" />' },
  },
}

describe('BaseButton UI', () => {
  it('uses native button semantics and emits clicks', async () => {
    const onClick = vi.fn()
    const wrapper = mount(BaseButton, {
      attrs: { onClick },
      slots: { default: '开始学习' },
      global,
    })

    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    await button.trigger('click')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('exposes disabled and loading states to assistive technology', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: '保存' },
      global,
    })

    const button = wrapper.get('button')
    expect(button.attributes()).toHaveProperty('disabled')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
  })
})
