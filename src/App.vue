<template>
  <div class="flex w-full h-screen overflow-hidden">
    <Navbar />
    <main class="flex-1 overflow-auto">
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
    DeviceConnection
  },
  setup() {
    const isNavbarCollapsed = ref(false);
    const route = useRoute();

    // 根据当前路由判断是否为设置页面
    const isDisplatDeviceConnection = computed(() => {
      switch (route.path) {
        case '/setting':
        case '/about':
          return false;
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
      isDisplatDeviceConnection
    };
  }
};
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
