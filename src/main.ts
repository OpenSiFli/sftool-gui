import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import router from './router'
import { createPinia } from "pinia";
import { i18n, setupI18n } from './i18n'
import { useUserStore } from "./stores/userStore.ts";

// 引入FontAwesome
import '@fortawesome/fontawesome-free/css/all.css'
import 'material-icons/iconfont/material-icons.css';

const pinia = createPinia();

// 创建Vue应用实例
const app = createApp(App)

// 使用Vue Router
app.use(router)
    .use(i18n)
    .use(pinia);

async function initApp() {
    // 1. 加载用户配置
    const userStore = useUserStore();
    await userStore.loadAll();

    // 2. 设置语言
    await setupI18n();

    // 3. 挂载应用
    app.mount("#app");
}

// 启动应用
initApp().catch(error => console.error('Failed to initialize app:', error));
