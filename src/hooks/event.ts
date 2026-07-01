import { onMounted, onUnmounted, watch, onDeactivated } from "vue";
import { emitter, EventKey } from "@/utils/eventBus.ts";
import { useRuntimeStore } from "@/stores/runtime.ts";
import { useSettingStore } from "@/stores/setting.ts";
import { ShortcutKey } from "@/types/types.ts";
import { isMobile } from "@/utils";

let mobileInputUsers = 0
const mobileInputEventValues = new WeakMap<InputEvent, Array<string | null>>()

function focusMobileInput(input: HTMLInputElement | null) {
  if (!input) return
  input.focus({preventScroll: true})
  input.setSelectionRange(input.value.length, input.value.length)
}

function getMobileInputValues(event: InputEvent, input: HTMLInputElement): Array<string | null> {
  const cached = mobileInputEventValues.get(event)
  if (cached) return cached

  const isDeletion = event.inputType.startsWith('delete') || (event.data === null && input.value === '')
  const inputValue = input.value.startsWith('1') ? input.value.slice(1) : input.value
  const values = isDeletion ? [null] : Array.from(event.data ?? inputValue)
  mobileInputEventValues.set(event, values)
  return values
}

export function useWindowClick(cb: (e: PointerEvent) => void) {
  onMounted(() => {
    emitter.on(EventKey.closeOther, cb)
    window.addEventListener('click', cb)
  })
  onUnmounted(() => {
    window.removeEventListener('click', cb)
  })
}

export function useEventListener(type: string, listener: EventListenerOrEventListenerObject) {
  let mobileInput: HTMLInputElement | null = null
  let mobileInputListener: ((event: InputEvent) => void) | null = null
  let refocusMobileInput: (() => void) | null = null
  let active = false

  onMounted(() => {
    active = true
    if (isMobile()) {
      mobileInput = document.querySelector('#typing-listener')
      if (!mobileInput) {
        mobileInput = document.createElement('input')
        mobileInput.id = 'typing-listener'
        mobileInput.type = 'text'
        mobileInput.tabIndex = -1
        mobileInput.autocomplete = 'off'
        mobileInput.autocapitalize = 'off'
        mobileInput.spellcheck = false
        mobileInput.inputMode = 'text'
        mobileInput.lang = 'en'
        mobileInput.setAttribute('autocorrect', 'off')
        mobileInput.setAttribute('aria-label', '练习输入')
        document.body.appendChild(mobileInput)
      }

      mobileInputUsers++
      mobileInput.value = '1'
      mobileInputListener = (event: InputEvent) => {
        const values = getMobileInputValues(event, mobileInput!)
        for (const value of values) {
          const keyboardEvent = event as any
          if (value === null) {
            keyboardEvent.key = 'Backspace'
            keyboardEvent.code = 'Backspace'
            keyboardEvent.keyCode = 8
          } else {
            keyboardEvent.key = value
            keyboardEvent.code = value === ' ' ? 'Space' : `Key${value.toUpperCase()}`
            keyboardEvent.keyCode = value === ' ' ? 32 : value.toUpperCase().charCodeAt(0)
          }
          keyboardEvent.ctrlKey = false
          keyboardEvent.altKey = false
          keyboardEvent.shiftKey = false
          listener instanceof Function ? listener(keyboardEvent) : listener.handleEvent(keyboardEvent)
        }
        mobileInput!.value = '1'
        mobileInput!.setSelectionRange(1, 1)
      }
      mobileInput.addEventListener('input', mobileInputListener)
      refocusMobileInput = () => {
        focusMobileInput(mobileInput)
      }
      window.addEventListener('click', refocusMobileInput)
      window.addEventListener(type, listener)
      focusMobileInput(mobileInput)
    } else {
      window.addEventListener(type, listener)
    }
  })
  const remove = () => {
    if (!active) return
    active = false
    if (isMobile()) {
      if (mobileInput && mobileInputListener) mobileInput.removeEventListener('input', mobileInputListener)
      if (refocusMobileInput) window.removeEventListener('click', refocusMobileInput)
      window.removeEventListener(type, listener)
      mobileInputUsers = Math.max(0, mobileInputUsers - 1)
      if (mobileInputUsers === 0) mobileInput?.remove()
      mobileInput = null
    } else {
      window.removeEventListener(type, listener)
    }
  }
  onUnmounted(remove)
  onDeactivated(remove)
}

export function getShortcutKey(e: KeyboardEvent) {
  let shortcutKey = ''
  if (e.ctrlKey) shortcutKey += 'Ctrl+'
  if (e.altKey) shortcutKey += 'Alt+'
  if (e.shiftKey) shortcutKey += 'Shift+'
  if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift') {
    if (e.keyCode >= 65 && e.keyCode <= 90) {
      shortcutKey += e.key.toUpperCase()
    } else {
      if (e.key === 'ArrowRight') {
        shortcutKey += '➡'
      } else if (e.key === 'ArrowLeft') {
        shortcutKey += '⬅'
      } else if (e.key === 'ArrowUp') {
        shortcutKey += '⬆'
      } else if (e.key === 'ArrowDown') {
        shortcutKey += '⬇'
      } else {
        shortcutKey += e.key
      }
    }
  }
  shortcutKey = shortcutKey.trim()

  // console.log('key', shortcutKey)
  return shortcutKey
}

export function useStartKeyboardEventListener() {
  const runtimeStore = useRuntimeStore()
  const settingStore = useSettingStore()

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (!runtimeStore.disableEventListener) {

      // 检查当前单词是否包含空格，如果包含，则空格键应该被视为输入
      if (e.code === 'Space') {
        // 获取当前正在输入的单词信息
        const currentWord = window.__CURRENT_WORD_INFO__;

        // 如果当前单词包含空格，且下一个字符应该是空格，则将空格键视为输入
        // 或者如果当前处于输入锁定状态（等待空格输入），也将空格键视为输入
        if (currentWord &&
          ((currentWord.word &&
              currentWord.word.includes(' ') &&
              currentWord.word[currentWord.input.length] === ' ') ||
            currentWord.inputLock === true)) {
          e.preventDefault();
          return emitter.emit(EventKey.onTyping, e);
        }
      }

      let shortcutKey = getShortcutKey(e)
      // console.log('shortcutKey', shortcutKey)

      let list = Object.entries(settingStore.shortcutKeyMap)
      let shortcutEvent = ''
      for (let i = 0; i < list.length; i++) {
        let [k, v] = list[i]
        if (v === shortcutKey) {
          // console.log('快捷键', k)
          shortcutEvent = k
          break
        }
      }
      if (shortcutEvent) {
        e.preventDefault()
        emitter.emit(shortcutEvent, e)
      } else {
        //非英文模式下，输入区域的 keyCode 均为 229时，
        // 空格键始终应该被转发到onTyping函数，由它来决定是作为输入还是切换单词
        if (e.code === 'Space') {
          e.preventDefault();
          return emitter.emit(EventKey.onTyping, e);
        }

        if (((e.keyCode >= 65 && e.keyCode <= 90)
          || (e.keyCode >= 48 && e.keyCode <= 57)
          // 空格键已经在上面处理过了
          || e.code === 'Slash'
          || e.code === 'Quote'
          || e.code === 'Comma'
          || e.code === 'BracketLeft'
          || e.code === 'BracketRight'
          || e.code === 'Period'
          || e.code === 'Minus'
          || e.code === 'Equal'
          || e.code === 'Semicolon'
          // || e.code === 'Backquote'
          || e.keyCode === 229
          //当按下功能键时，不阻止事件传播
        ) && (!e.ctrlKey && !e.altKey)) {
          e.preventDefault()
          emitter.emit(EventKey.onTyping, e)
        } else {
          emitter.emit(EventKey.keydown, e)
        }
      }

    }
  })
  useEventListener('keyup', (e: KeyboardEvent) => {
    if (!runtimeStore.disableEventListener) {
      emitter.emit(EventKey.keyup, e)
    }
  })
}

export function useOnKeyboardEventListener(onKeyDown: (e: KeyboardEvent) => void, onKeyUp: (e: KeyboardEvent) => void) {
  onMounted(() => {
    emitter.on(EventKey.keydown, onKeyDown)
    emitter.on(EventKey.keyup, onKeyUp)
  })
  onUnmounted(() => {
    emitter.off(EventKey.keydown, onKeyDown)
    emitter.off(EventKey.keyup, onKeyUp)
  })
}

//因为如果用useStartKeyboardEventListener局部变量控制，当出现多个hooks时就不行了，所以用全局变量来控制
export function useDisableEventListener(watchVal: any) {
  const runtimeStore = useRuntimeStore()
  watch(watchVal, (n: any) => {
    runtimeStore.disableEventListener = n
  })
}
