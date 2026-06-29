import { expect, test } from '@playwright/test'

test('restores adopted cats after export, cat reset, and import', async ({ page }, testInfo) => {
  await page.goto('./login')
  await page.getByRole('button', { name: 'admin' }).click()
  await page.getByLabel('首次登录，请设置密码').fill('admin-pass')
  await page.getByLabel('确认密码').fill('admin-pass')
  await page.getByRole('button', { name: '设置密码并登录' }).click()
  await expect(page).toHaveURL(/\/type-words\/$/)

  await page.goto('./cat-room')
  await page.getByRole('button', { name: '领取 三弟 · 1000 积分' }).click()
  await expect(page.getByRole('heading', { name: '三弟', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: '关闭猫咪详情' }).click()

  await page.goto('./setting')
  await page.getByText('数据管理', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出全部用户数据' }).click()
  const download = await downloadPromise
  const backupPath = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(backupPath)

  await page.getByText('猫咪设置', { exact: true }).click()
  await expect(page.getByText('已领养猫咪:')).toBeVisible()
  await page.getByRole('button', { name: '重置数据' }).click()
  await page.getByText('确认', { exact: true }).click()
  await expect(page.getByText('已领养猫咪:').locator('..')).toContainText('0')

  await page.getByText('数据管理', { exact: true }).click()
  const reloadPromise = page.waitForEvent('load')
  await page.locator('input[type="file"]').setInputFiles(backupPath)
  await reloadPromise

  await page.goto('./cat-room')
  await expect(page.locator('.cat-grid .cat-card')).toHaveCount(1)
  await expect(page.locator('.cat-grid .cat-card')).toContainText('三弟')
  await expect(page.getByLabel('猫咖状态').locator('.hud-item').filter({hasText: '只猫咪'}).locator('.hud-value')).toHaveText('1')
})
