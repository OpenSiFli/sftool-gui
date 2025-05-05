import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// 创建Vue应用实例
const app = createApp(App)

// 使用Vue Router
app.use(router)

// 使用国际化
app.use(i18n)

// 挂载应用
app.mount('#app')
