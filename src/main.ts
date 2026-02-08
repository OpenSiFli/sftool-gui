import { createApp } from 'vue';
import './index.css';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { i18n, setupI18n } from './i18n';
import { useUserStore } from './stores/userStore.ts';
import { useMassProductionStore } from './stores/massProductionStore.ts';

// 引入FontAwesome
import '@fortawesome/fontawesome-free/css/all.css';
import 'material-icons/iconfont/material-icons.css';

const pinia = createPinia();

// 创建Vue应用实例
const app = createApp(App);

// 使用Vue Router
app.use(router).use(i18n).use(pinia);

router.beforeEach(async (to, from) => {
  const massProductionStore = useMassProductionStore();

  if (to.path === '/mass-production') {
    return true;
  }

  if (!massProductionStore.isEnabled) {
    return true;
  }

  const message = i18n.global.t('massProduction.navigationLocked') as string;
  if (typeof window !== 'undefined') {
    alert(message);
  }

  return from.fullPath || '/mass-production';
});

async function initApp() {
  // 1. 加载用户配置
  const userStore = useUserStore();
  await userStore.loadAll();

  // 2. 预加载量产配置与日志（含过期清理）
  const massProductionStore = useMassProductionStore();
  await massProductionStore.loadFromStorage();

  // 3. 设置语言
  await setupI18n();

  // 4. 挂载应用
  app.mount('#app');
}

// 启动应用
initApp().catch(error => console.error('Failed to initialize app:', error));
