import { createRouter, createWebHashHistory } from 'vue-router';
import SettingsView from '../views/SettingsView.vue';
import WriteFlashView from '../views/WriteFlashView.vue';
import ReadFlashView from '../views/ReadFlashView.vue';
import EraseFlashView from '../views/EraseFlashView.vue';
import AboutView from '../views/AboutView.vue';
import LogWindowView from '../views/LogWindowView.vue';
import StubConfig from '../views/StubConfigView.vue';

const routes = [
  { path: '/', redirect: '/write-flash' },
  { path: '/setting', name: 'Setting', component: SettingsView },
  { path: '/write-flash', name: 'WriteFlash', component: WriteFlashView },
  { path: '/read-flash', name: 'ReadFlash', component: ReadFlashView },
  { path: '/erase-flash', name: 'EraseFlash', component: EraseFlashView },
  { path: '/about', name: 'About', component: AboutView },
  { path: '/log-window', name: 'LogWindow', component: LogWindowView },
  { path: '/stubconfig', name: 'StubConfig', component: StubConfig },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
