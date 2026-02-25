import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

// 不从 utils/locale.ts 导入 LOCALE_KEY，避免循环依赖
// （utils/locale.ts 依赖 i18n/index.ts）
const LOCALE_KEY = 'locale'

function getDefaultLocale(): string {
  const saved = localStorage.getItem(LOCALE_KEY)
  if (saved && (saved === 'zh-CN' || saved === 'en-US')) {
    return saved
  }
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

export default i18n
