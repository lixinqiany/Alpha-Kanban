import i18n from '../i18n'

export const LOCALE_KEY = 'locale'

export type SupportedLocale = 'zh-CN' | 'en-US'

export function setLocale(lang: SupportedLocale) {
  i18n.global.locale.value = lang
  localStorage.setItem(LOCALE_KEY, lang)
}

export function getLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale
}

export function toggleLocale() {
  const current = getLocale()
  setLocale(current === 'zh-CN' ? 'en-US' : 'zh-CN')
}
