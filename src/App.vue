<template>
  <!-- 日志窗口布局 -->
  <div v-if="isLogWindow" class="w-full h-screen overflow-hidden">
    <router-view />
  </div>

  <!-- 主窗口布局 -->
  <div v-else class="flex w-full h-screen overflow-hidden">
    <Navbar />
    <main class="flex-1 overflow-auto relative">
      <router-view />
    </main>
    <DeviceConnection v-if="isDisplatDeviceConnection" class="h-screen bg-base-200 overflow-auto py-6 px-4" />
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import DeviceConnection from './components/DeviceConnection.vue';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  components: {
    Navbar,
    DeviceConnection,
  },
  setup() {
    const isNavbarCollapsed = ref(false);
    const route = useRoute();

    // 检查是否为日志窗口
    const isLogWindow = computed(() => {
      return route.path === '/log-window';
    });

    // 根据当前路由判断是否显示设备连接面板
    const isDisplatDeviceConnection = computed(() => {
      if (isLogWindow.value) return false;

      switch (route.path) {
        case '/setting':
        case '/about':
        case '/mass-production':
          return false;
        case '/':
        case '/write-flash':
        case '/read-flash':
        case '/erase-flash':
        default:
          return true;
      }
    });

    // 监听导航栏折叠状态变化
    const updateNavbarState = () => {
      isNavbarCollapsed.value = localStorage.getItem('navbarCollapsed') === 'true';
    };

    // 初始化获取导航栏状态
    onMounted(() => {
      updateNavbarState();
      // 添加storage事件监听器，当localStorage变化时更新状态
      window.addEventListener('storage', updateNavbarState);
      // 创建一个自定义事件监听器来处理同一窗口内的变化
      window.addEventListener('navbarStateChanged', updateNavbarState);
    });

    onUnmounted(() => {
      window.removeEventListener('storage', updateNavbarState);
      window.removeEventListener('navbarStateChanged', updateNavbarState);
    });

    return {
      isNavbarCollapsed,
      isLogWindow,
      isDisplatDeviceConnection,
    };
  },
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
