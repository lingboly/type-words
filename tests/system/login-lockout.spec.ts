import { expect, test } from '@playwright/test'

test('one failed login submission shows exactly one error and consumes one attempt', async ({ page }) => {
  await page.goto('./login')
  await page.getByRole('button', { name: 'admin' }).click()
  await page.getByLabel('首次登录，请设置密码').fill('AdminPass')
  await page.getByLabel('确认密码').fill('AdminPass')
  await page.getByRole('button', { name: '设置密码并登录' }).click()
  await expect(page).toHaveURL(/\/type-words\/$/)

  await page.getByRole('button', { name: '登出' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'admin' }).click()
  const password = page.getByLabel('密码', {exact: true})
  await password.fill('WrongPass')
  await password.press('Enter')

  await expect(page.locator('.toast-container')).toHaveCount(1)
  await expect(page.locator('.toast-container .message-text')).toHaveText('用户名或密码错误，还有 2 次机会')
})
