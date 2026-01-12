<template>
  <div class="min-h-screen bg-base-100 py-10 px-4 md:px-8 flex flex-col">
    <div class="max-w-4xl mx-auto bg-base-200 rounded-lg shadow-md overflow-hidden w-full">
      <!-- 页面标题 - 居中放置，无底色 -->
      <div class="p-6 text-center mb-6">
        <h1 class="text-3xl font-bold">{{ $t('navbar.about') }}</h1>
      </div>

      <!-- 关于内容 -->
      <div class="p-6 space-y-6">
        <!-- 应用信息卡片 -->
        <div class="bg-base-100 p-4 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-4 flex items-center">
            <span class="material-icons mr-2">apps</span>
            SFTool GUI
          </h2>

          <!-- 版本号 -->
          <div class="flex items-center py-2 border-b border-base-300">
            <span class="material-icons text-info mr-2">new_releases</span>
            <span class="font-medium">{{ $t('about.version') }}:</span>
            <span class="ml-auto">v{{ appVersion }}</span>
          </div>

          <!-- 开源协议 -->
          <div class="flex items-center py-2 border-b border-base-300">
            <span class="material-icons text-success mr-2">gavel</span>
            <span class="font-medium">{{ $t('about.license') }}:</span>
            <span class="ml-auto">Apache-2.0</span>
          </div>

          <!-- 开源地址 -->
          <div class="flex items-center py-2 border-b border-base-300">
            <span class="material-icons text-secondary mr-2">code</span>
            <span class="font-medium">{{ $t('about.repository') }}:</span>
            <a
              href="https://github.com/OpenSiFli/sftool-gui"
              target="_blank"
              class="ml-auto text-primary hover:underline flex items-center"
            >
              <span class="fab fa-github mr-1"></span>
              GitHub
              <span class="material-icons text-sm ml-1">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部版权信息 - 移到页面最底部 -->
    <div class="w-full text-center mt-auto py-4">
      <div class="flex items-center justify-center">
        <span class="material-icons text-xs text-gray-500 mr-1">copyright</span>
        <span class="text-sm text-gray-500">2026 SiFli Technologies(Nanjing) Co., Ltd</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getVersion } from '@tauri-apps/api/app';

// About page component
const appVersion = ref('0.0.1');

onMounted(async () => {
  try {
    appVersion.value = await getVersion();
  } catch (error) {
    console.error('Failed to get app version:', error);
    appVersion.value = '0.0.1';
  }
});
</script>

<style scoped>
/* 自定义样式 */
</style>
