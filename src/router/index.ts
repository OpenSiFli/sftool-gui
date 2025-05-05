import { createRouter, createWebHashHistory } from 'vue-router'
import SettingsView from '../views/SettingsView.vue'
import WriteFlashView from '../views/WriteFlashView.vue'

const routes = [
  {path: '/', redirect: '/setting'},
  {path: '/setting', name: 'Setting', component: SettingsView},
  {path: '/write-flash', name: 'WriteFlash', component: WriteFlashView},
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router