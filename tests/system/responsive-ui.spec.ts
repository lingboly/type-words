import { expect, test } from '@playwright/test'

const routes = ['./', './words', './articles', './setting', './cat-room']

async function loginAsAdmin(page) {
  await page.goto('./login')
  await page.getByRole('button', {name: 'admin'}).click()
  await page.getByLabel('首次登录，请设置密码').fill('AdminPass')
  await page.getByLabel('确认密码').fill('AdminPass')
  await page.getByRole('button', {name: '设置密码并登录'}).click()
  await expect(page).toHaveURL(/\/type-words\/$/)
}

async function seedMobilePractice(page) {
  const word = {
    id: 'mobile',
    custom: true,
    word: 'mobile',
    phonetic0: 'ˈməʊbaɪl',
    phonetic1: 'ˈmoʊbəl',
    trans: [{pos: 'adj.', cn: '移动的'}],
    sentences: [{c: 'This layout works on mobile.', cn: '这个布局适用于手机。'}],
    phrases: [],
    synos: [],
    relWords: {root: '', rels: []},
    etymology: [],
  }
  const nextWord = {
    ...word,
    id: 'screen',
    word: 'screen',
    phonetic0: 'skriːn',
    phonetic1: 'skriːn',
    trans: [{pos: 'n.', cn: '屏幕'}],
    sentences: [{c: 'The content fits the screen.', cn: '内容适应屏幕。'}],
  }
  const emptyDict = (id, name) => ({
    id,
    name,
    description: '',
    url: '',
    length: 0,
    category: '',
    tags: [],
    translateLanguage: '',
    type: 'word',
    language: 'en',
    lastLearnIndex: 0,
    perDayStudyNumber: 20,
    custom: false,
    complete: false,
    createdBy: '',
    en_name: '',
    category_id: null,
    is_default: false,
    words: [],
    articles: [],
    statistics: [],
  })
  const practiceDict = {
    ...emptyDict('mobile-test', 'Mobile test'),
    length: 2,
    perDayStudyNumber: 2,
    custom: true,
    words: [word, nextWord],
  }
  const state = {
    simpleWords: [],
    load: false,
    word: {
      studyIndex: 3,
      bookList: [
        emptyDict('word-collect', '收藏'),
        emptyDict('word-wrong', '错词'),
        emptyDict('word-known', '已掌握'),
        practiceDict,
      ],
    },
    article: {studyIndex: -1, bookList: []},
    dictListVersion: 1,
  }

  await page.evaluate(async value => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const transaction = request.result.transaction('keyval', 'readwrite')
        transaction.objectStore('keyval').put(
          JSON.stringify({val: value, version: 4}),
          'type-words:user:admin:typing-word-dict',
        )
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, state)
}

test.describe('responsive UI', () => {
  test.beforeEach(async ({page}) => loginAsAdmin(page))

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

  test('mobile navigation and account controls do not cover page content', async ({page}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile layout assertion')
    await page.goto('./words')

    const account = await page.locator('.account-menu').boundingBox()
    const content = await page.locator('.content-shell').boundingBox()
    const viewport = page.viewportSize()!

    expect(account).not.toBeNull()
    expect(content).not.toBeNull()
    expect(account!.y + account!.height).toBeLessThanOrEqual(content!.y + 1)
    expect(content!.x).toBe(0)
    expect(content!.width).toBe(viewport.width)
    await expect(page.getByRole('button', {name: '登出'})).toBeVisible()
    await expect(page.getByRole('button', {name: '单词', exact: true})).toBeInViewport()
  })

  test('mobile practice hides its keyboard proxy and supports typing and deletion', async ({page}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile layout assertion')
    await seedMobilePractice(page)
    await page.goto('./practice-words/mobile-test')

    const input = page.locator('#typing-listener')
    await expect(input).toBeAttached()
    await expect(input).toHaveCSS('opacity', '0')
    const inputBox = await input.boundingBox()
    expect(inputBox!.width).toBeLessThanOrEqual(1)
    expect(inputBox!.height).toBeLessThanOrEqual(1)

    const practice = await page.locator('.practice-word').boundingBox()
    const practiceLayout = await page.locator('.practice-layout').boundingBox()
    const practiceContent = await page.locator('.practice-layout .wrap').boundingBox()
    const navigation = await page.locator('.aside.fixed').boundingBox()
    const viewport = page.viewportSize()!
    expect(practice!.x).toBeGreaterThanOrEqual(0)
    expect(practice!.x + practice!.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(practiceContent!.height).toBeGreaterThan(practiceLayout!.height * 0.8)
    await expect(page.locator('.panel-wrap .panel')).not.toBeVisible()

    const focusedAfterTap = await page.locator('.typing-word').evaluate(element => {
      const keyboardProxy = document.querySelector<HTMLInputElement>('#typing-listener')!
      keyboardProxy.blur()
      element.click()
      return document.activeElement?.id
    })
    expect(focusedAfterTap).toBe('typing-listener')

    await input.evaluate(element => {
      const keyboardProxy = element as HTMLInputElement
      keyboardProxy.value = '1m'
      keyboardProxy.dispatchEvent(new InputEvent('input', {
        data: null,
        inputType: 'insertCompositionText',
        bubbles: true,
      }))
    })
    await expect(page.locator('.typing-word .word .input')).toHaveText('m')

    await input.evaluate(element => {
      element.dispatchEvent(new InputEvent('input', {data: null, inputType: 'deleteContentBackward', bubbles: true}))
    })
    await expect(page.locator('.typing-word .word .input')).toHaveCount(0)

    const nextButton = page.getByRole('button', {name: '下一个单词'})
    await expect(nextButton).toBeVisible()
    await nextButton.click()
    await expect(page.locator('.typing-word .word.my-1')).toContainText('screen')

    const completeButton = page.getByRole('button', {name: '完成本组'})
    await expect(completeButton).toBeVisible()
    await completeButton.click()
    await expect(page.locator('.footer .stat')).toContainText('正在默写新词')

    const toolbar = page.locator('.footer .bottom')
    const toolbarToggle = page.getByRole('button', {name: '展开学习工具栏'})
    await expect(toolbarToggle).toBeVisible()
    await expect(toolbar).not.toBeVisible()
    await toolbarToggle.click()
    await expect(toolbar).toBeInViewport()
    await expect.poll(async () => {
      const toolbarBox = await toolbar.boundingBox()
      return toolbarBox!.y + toolbarBox!.height
    }).toBeLessThanOrEqual(navigation!.y + 1)

    await page.goto('./words')
    await expect(page.locator('#typing-listener')).toHaveCount(0)
  })
})
