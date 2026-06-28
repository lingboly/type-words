import { expect, test } from '@playwright/test'

const routes = ['./', './words', './articles', './setting', './cat-room']

test.describe('responsive UI', () => {
  for (const route of routes) {
    test(`${route} keeps primary content inside the viewport`, async ({ page }) => {
      await page.goto(route)

      const primary = page.locator('main, .cat-room, .feature-grid-wrap').last()
      await expect(primary).toBeVisible()
      const box = await primary.boundingBox()
      const viewport = page.viewportSize()

      expect(box).not.toBeNull()
      expect(viewport).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1)
      expect(box!.width).toBeGreaterThan(240)
    })
  }

  test('home feature cards reflow instead of becoming vertical text', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile layout assertion')
    await page.goto('./')

    const cards = page.locator('.feature-grid .card')
    await expect(cards).toHaveCount(8)
    const first = await cards.first().boundingBox()
    const second = await cards.nth(1).boundingBox()

    expect(first!.width).toBeGreaterThan(200)
    expect(second!.y).toBeGreaterThan(first!.y)
  })

  test('settings remain readable and controls remain reachable on mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile layout assertion')
    await page.goto('./setting')

    const content = page.locator('.setting .content')
    const box = await content.boundingBox()
    expect(box!.width).toBeGreaterThan(240)
    await expect(page.getByText('忽略大小写')).toBeVisible()
    await expect(page.locator('.setting .tabs')).toHaveCSS('overflow-x', 'auto')
  })
})
