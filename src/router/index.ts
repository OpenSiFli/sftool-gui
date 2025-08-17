import { createRouter, createWebHashHistory } from 'vue-router'
import SettingsView from '../views/SettingsView.vue'
import WriteFlashView from '../views/WriteFlashView.vue'
import AboutView from '../views/AboutView.vue'
import LogWindowView from '../views/LogWindowView.vue'

const routes = [
  {path: '/', redirect: '/setting'},
  {path: '/setting', name: 'Setting', component: SettingsView},
  {path: '/write-flash', name: 'WriteFlash', component: WriteFlashView},
  {path: '/about', name: 'About', component: AboutView},
  {path: '/log-window', name: 'LogWindow', component: LogWindowView},
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router