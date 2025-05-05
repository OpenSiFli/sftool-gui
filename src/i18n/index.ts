import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zhCN from './locales/zh-CN'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN', // 默认语言
  fallbackLocale: 'en', // 备用语言
  messages: {
    'en': en,
    'zh-CN': zhCN
  }
})

export default i18n