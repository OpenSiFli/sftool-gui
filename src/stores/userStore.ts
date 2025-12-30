import { defineStore } from 'pinia';
import { load } from '@tauri-apps/plugin-store';

// 主题类型
export type ThemeType = 'dark' | 'light' | 'system';

// 存储实例
let store: any = null;

// 初始化存储
const initStore = async () => {
  if (!store) {
    store = await load('setting.json', { autoSave: false });
  }
  return store;
};

export const useUserStore = defineStore('user', {
  state: () => ({
    language: '',
    theme: 'system' as ThemeType,
    menuCollapsed: false,
  }),
  actions: {
    async loadLanguage() {
      const storeInstance = await initStore();
      const val = await storeInstance.get('language');
      if (val && val.value) {
        console.log(`Get language ${val.value}`);
        this.language = val.value;
      } else {
        console.log('No language found, use default language zh');
        this.language = 'zh';
      }
    },
    async setLanguage(language: string) {
      this.language = language;
      // 保存到本地存储
      const storeInstance = await initStore();
      await storeInstance.set('language', { value: language });
      await storeInstance.save();
    },

    async loadTheme() {
      const storeInstance = await initStore();
      const val = await storeInstance.get('theme');
      if (val && val.value) {
        console.log(`Get theme ${val.value}`);
        this.theme = val.value;
        this.applyTheme(val.value);
      } else {
        console.log('No theme found, use default theme system');
        this.theme = 'system';
        this.applyTheme('system');
      }
    },

    async setTheme(theme: ThemeType) {
      this.theme = theme;
      this.applyTheme(theme);
      // 保存到本地存储
      const storeInstance = await initStore();
      await storeInstance.set('theme', { value: theme });
      await storeInstance.save();
    },

    // 应用主题到文档
    applyTheme(theme: ThemeType) {
      // 根据主题类型设置data-theme属性
      if (theme === 'system') {
        // 检测系统主题
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        });
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    },

    async loadMenuState() {
      const storeInstance = await initStore();
      const val = await storeInstance.get('menuCollapsed');
      if (val !== null && val !== undefined && val.value !== undefined) {
        console.log(`Get menu collapsed state ${val.value}`);
        this.menuCollapsed = val.value;
      } else {
        console.log('No menu state found, use default state false');
        this.menuCollapsed = false;
      }
    },

    async setMenuCollapsed(collapsed: boolean) {
      this.menuCollapsed = collapsed;
      // 保存到本地存储
      const storeInstance = await initStore();
      await storeInstance.set('menuCollapsed', { value: collapsed });
      await storeInstance.save();
    },

    async loadAll() {
      await this.loadLanguage();
      await this.loadTheme();
      await this.loadMenuState();
    },
  },
});
