import { expect, test } from '@playwright/test'

async function seedCat(page, overrides: Record<string, unknown> = {}) {
  await page.goto('./')
  await page.evaluate(async data => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('keyval')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const transaction = request.result.transaction('keyval', 'readwrite')
        transaction.objectStore('keyval').put(data, 'cat-cafe-data')
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, {
    cats: [{
      id: 'huanu-test',
      photoKey: '花奴-三花猫.jpg',
      name: '花奴',
      adoptedAt: Date.now(),
      status: 'healthy',
      rarity: 'premium',
      health: 100,
      affection: 80,
      hunger: 40,
      feedCount: 0,
      playCount: 0,
      lastLoginCheck: Date.now(),
      interactionDate: new Date().toISOString().slice(0, 10),
      dailyPetPoints: 0,
      dailyPlayCount: 0,
      ...overrides,
    }],
    points: 120,
    perfectGames: 4,
    perfectStreak: 2,
    communityHealCount: 1,
    catEnabled: true,
    showPracticeCompanion: true,
    showAnimations: false,
  })
}

test.describe('cat cafe UI', () => {
  test('empty room lets the user adopt a starter cat and open its care controls', async ({ page }) => {
    await page.goto('./cat-room')

    await expect(page.getByRole('heading', { name: '选择你的第一只猫咪伙伴' })).toBeVisible()
    await page.getByRole('button', { name: '免费领养 二妹' }).click()
    await expect(page.getByRole('heading', { name: '二妹', level: 2 })).toBeVisible()
    await expect(page.getByRole('button', { name: /基础猫粮/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /普通药品/ })).toBeDisabled()
    await page.getByRole('button', { name: '关闭猫咪详情' }).click()
    await expect(page.getByRole('button', { name: /二妹/ })).toBeVisible()
  })

  test('starter adoption works when secure random APIs are unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Crypto.prototype, 'getRandomValues', {
        configurable: true,
        value: undefined,
      })
    })
    await page.goto('./cat-room')
    await page.getByRole('button', { name: '免费领养 二妹' }).click()

    await expect(page.getByRole('heading', { name: '二妹', level: 2 })).toBeVisible()
    await expect(page.getByRole('button', { name: /基础猫粮/ })).toBeVisible()
  })

  test('parent gate rejects an invalid password and accepts the default password', async ({ page }) => {
    await page.goto('./setting')
    await page.getByText('猫咪设置', { exact: true }).click()

    const password = page.getByPlaceholder('输入4–8位数字密码')
    await password.fill('0000')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('密码错误！剩余尝试次数: 4')).toBeVisible()

    await password.fill('1234')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('已解锁', { exact: false })).toBeVisible()
    await expect(page.getByText('启用猫咖功能')).toBeVisible()
  })

  test('parent gate works when Web Crypto is unavailable on plain HTTP', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Crypto.prototype, 'subtle', {
        configurable: true,
        get: () => undefined,
      })
    })
    await page.goto('./setting')
    await page.getByText('猫咪设置', { exact: true }).click()
    await page.getByPlaceholder('输入4–8位数字密码').fill('1234')
    await page.getByRole('button', { name: '确认' }).click()

    await expect(page.getByText('已解锁', { exact: false })).toBeVisible()
  })

  test('parent can tune cat rules and enable test mode', async ({ page }) => {
    await page.goto('./setting')
    await page.getByText('猫咪设置', { exact: true }).click()
    await page.getByPlaceholder('输入4–8位数字密码').fill('1234')
    await page.getByRole('button', { name: '确认' }).click()

    await expect(page.getByRole('heading', { name: '猫咪参数' })).toBeVisible()
    await page.getByLabel('基础猫粮').fill('9')
    await page.getByLabel('基础猫粮').blur()

    await page.getByRole('switch').last().click()
    await expect(page.getByText('TEST', { exact: true })).toBeVisible()
    await page.getByLabel('当前测试积分').fill('777')
    await page.getByRole('button', { name: '应用积分' }).click()
    await expect(page.getByText('777', { exact: true }).first()).toBeVisible()

  })

  test('parent can change the password and unlock again', async ({ page }) => {
    await page.goto('./setting')
    await page.getByText('猫咪设置', { exact: true }).click()
    await page.getByPlaceholder('输入4–8位数字密码').fill('1234')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('已解锁', { exact: false })).toBeVisible()

    await page.getByLabel('当前密码', { exact: true }).fill('1234')
    await page.getByLabel('新密码', { exact: true }).fill('5678')
    await page.getByLabel('确认新密码', { exact: true }).fill('5678')
    await page.getByRole('button', { name: '更新密码' }).click()
    await expect(page.getByLabel('当前密码', { exact: true })).toHaveValue('')
    await page.getByText('重新锁定').click()
    await page.getByPlaceholder('输入4–8位数字密码').fill('5678')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('已解锁', { exact: false })).toBeVisible()
  })

  test('home exposes cat status and room navigation', async ({ page }) => {
    await page.goto('./')

    await expect(page.getByRole('heading', { name: /知识猫咖/ })).toBeVisible()
    const avatar = page.getByRole('img', { name: /花奴，知识猫咖向导/ }).first()
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('src', /cat-avatar-huanu/)
    await expect(page.getByLabel('猫咖状态')).toContainText('积分')
    await page.getByRole('button', { name: '去看看猫咪们' }).click()
    await expect(page).toHaveURL(/\/cat-room$/)
  })

  test('cat room exposes collection HUD, rarity, and confirmed care spending', async ({ page }) => {
    await seedCat(page)
    await page.goto('./cat-room')

    await expect(page.getByLabel('猫咖状态')).toContainText('120')
    await expect(page.getByRole('button', { name: /花奴/ })).toContainText('珍藏')
    await page.getByRole('button', { name: /花奴/ }).click()
    await page.getByRole('button', { name: /基础猫粮/ }).click()
    await expect(page.getByRole('alert')).toContainText('确认花费 20 积分')
    await page.getByRole('button', { name: '确认消费' }).click()
    await expect(page.getByText('当前积分 ⭐ 100')).toBeVisible()
  })

  test('healthy cats can play for free with visible feedback and no point charge', async ({ page }) => {
    await seedCat(page, { health: 80, affection: 70 })
    await page.goto('./cat-room')
    await page.getByRole('button', { name: /花奴/ }).click()

    await page.getByRole('button', { name: '开始玩耍' }).click()

    await expect(page.getByText('玩得真开心！亲昵 +5，健康 +1')).toBeVisible()
    await expect(page.locator('.daily-summary')).toContainText('今日抚摸 0/40 · 玩耍 1/5')
    await expect(page.getByText('当前积分 ⭐ 120')).toBeVisible()
  })

  test('runaway cats move to the remote-care station', async ({ page }) => {
    await seedCat(page, { status: 'runaway', runawayFeedStreak: 3 })
    await page.goto('./cat-room')

    await expect(page.getByRole('heading', { name: /正在等你召回/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /花奴 3\/7 天/ })).toBeVisible()
  })

  test('care center exposes treatment for a sick cat on the same page', async ({ page }) => {
    await seedCat(page, { status: 'sick', health: 20, hunger: 75 })
    await page.goto('./cat-room')

    await page.getByRole('button', { name: /照护中心/ }).click()
    await expect(page.getByRole('heading', { name: '所有猫咪操作都在这里' })).toBeVisible()
    await page.getByRole('button', { name: /花奴.*前往救治/ }).click()
    await page.getByRole('button', { name: /普通药品/ }).click()
    await expect(page.getByRole('alert')).toContainText('确认花费 30 积分')
    await page.getByRole('button', { name: '确认消费' }).click()
    await expect(page.getByText('治疗完成，健康 +20')).toBeVisible()
  })
})
