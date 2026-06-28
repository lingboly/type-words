import { expect, test } from '@playwright/test'

const routes = [
  { path: './', landmark: '知识猫咖' },
  { path: './words', landmark: '我的词典' },
  { path: './articles', landmark: '我的书籍' },
  { path: './setting', landmark: '设置' },
  { path: './cat-room', landmark: '知识猫咖' },
]

test.describe('core navigation', () => {
  for (const route of routes) {
    test(`${route.path} loads without page errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))

      await page.goto(route.path)

      await expect(page.getByText(route.landmark, { exact: false }).first()).toBeVisible()
      await expect(page.locator('#app')).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('sidebar supports semantic keyboard navigation', async ({ page }) => {
    await page.goto('./')

    await page.getByRole('button', { name: '单词', exact: true }).focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/words$/)
    await expect(page.getByText('我的词典')).toBeVisible()
  })

  test('home calls to action navigate to both practice areas', async ({ page }) => {
    await page.goto('./')

    await page.getByRole('button', { name: '单词练习' }).click()
    await expect(page).toHaveURL(/\/words$/)

    await page.getByRole('button', { name: '主页' }).click()
    await page.getByRole('button', { name: '文章练习' }).click()
    await expect(page).toHaveURL(/\/articles$/)
  })
})
