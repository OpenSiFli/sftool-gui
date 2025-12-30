import { createI18n } from 'vue-i18n';
import zh from './locales/zh.json';
import en from './locales/en.json';
import { useUserStore } from '../stores/userStore';

// 默认语言
const DEFAULT_LOCALE = 'zh';

// 支持的语言映射
const messages = {
  zh,
  en,
};

// 定义可用语言类型，从messages对象自动提取
type AvailableLocales = keyof typeof messages;

// 语言列表配置
export interface Language {
  code: string; // 语言代码
  nativeName: string; // 当地语言名称
  englishName: string; // 英文名称
  langChar: string; // 语言典型字符
}

// 支持的所有语言
export const availableLanguages: Language[] = [
  {
    code: 'zh',
    nativeName: '简体中文',
    englishName: 'Simplified Chinese',
    langChar: '文',
  },
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    langChar: 'A',
  },
];

// 根据语言代码获取语言信息
export function getLanguageByCode(code: string): Language {
  return availableLanguages.find(lang => lang.code === code) || availableLanguages[0];
}

// 创建i18n实例
export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  messages,
});

// 获取可用的语言代码列表
export async function getAvailableLanguages(): Promise<string[]> {
  return availableLanguages.map(lang => lang.code);
}

// 初始化i18n
export async function setupI18n() {
  const userStore = useUserStore();
  await userStore.loadLanguage();
  i18n.global.locale.value = userStore.language as AvailableLocales;
}
