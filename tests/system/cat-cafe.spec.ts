import { expect, test } from '@playwright/test'

test.describe('cat cafe UI', () => {
  test('empty room guides the user back to study', async ({ page }) => {
    await page.goto('./cat-room')

    await expect(page.getByRole('heading', { name: '还没有猫咪...' })).toBeVisible()
    await page.getByRole('link', { name: '开始学习' }).click()
    await expect(page).toHaveURL(/\/words$/)
  })

  test('parent gate rejects an invalid password and accepts the default password', async ({ page }) => {
    await page.goto('./setting')
    await page.getByText('猫咪设置', { exact: true }).click()

    const password = page.getByPlaceholder('输入4位数字密码')
    await password.fill('0000')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('密码错误！剩余尝试次数: 4')).toBeVisible()

    await password.fill('1234')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('已解锁', { exact: false })).toBeVisible()
    await expect(page.getByText('启用猫咖功能')).toBeVisible()
  })

  test('home exposes cat status and room navigation', async ({ page }) => {
    await page.goto('./')

    await expect(page.getByRole('heading', { name: /知识猫咖/ })).toBeVisible()
    await expect(page.getByText('当前积分')).toBeVisible()
    await page.getByRole('button', { name: '去看看猫咪们' }).click()
    await expect(page).toHaveURL(/\/cat-room$/)
  })
})
