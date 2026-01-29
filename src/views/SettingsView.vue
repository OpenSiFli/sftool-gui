<script setup lang="ts">
import { ref, onMounted, computed, markRaw } from 'vue';
import { useUserStore, ThemeType } from '../stores/userStore';
import { useI18n } from 'vue-i18n';
import { availableLanguages, Language, getLanguageByCode } from '../i18n';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

// 获取用户存储和国际化
const userStore = useUserStore();
const { locale } = useI18n();

// 设置的实时状态
const activeTheme = ref<ThemeType>(userStore.theme as ThemeType);
const activeLanguage = ref<string>(userStore.language);

// 当前语言对象
const currentLanguage = computed<Language>(() => {
  return getLanguageByCode(activeLanguage.value);
});

// 下拉菜单显示状态
const isLanguageDropdownOpen = ref(false);

// 语言搜索功能
const searchQuery = ref('');
const filteredLanguages = computed(() => {
  if (!searchQuery.value) return availableLanguages;

  const query = searchQuery.value.toLowerCase();
  return availableLanguages.filter(
    lang =>
      lang.nativeName.toLowerCase().includes(query) ||
      lang.englishName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query)
  );
});

// 实时应用主题设置
const updateTheme = async (theme: ThemeType) => {
  activeTheme.value = theme;
  await userStore.setTheme(theme);
  showFeedback('theme');
};

// 实时应用语言设置
const updateLanguage = async (lang: string) => {
  activeLanguage.value = lang;
  await userStore.setLanguage(lang);
  locale.value = lang;
  isLanguageDropdownOpen.value = false; // 关闭下拉菜单
  showFeedback('language');
};

// 切换语言下拉菜单的显示状态
const toggleLanguageDropdown = () => {
  isLanguageDropdownOpen.value = !isLanguageDropdownOpen.value;
  if (isLanguageDropdownOpen.value) {
    // 重置搜索框
    searchQuery.value = '';
    // 添加延迟后聚焦搜索框
    setTimeout(() => {
      const searchInput = document.querySelector('.language-search-input') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }, 100);
  }
};

// 点击外部关闭下拉菜单
const closeLanguageDropdown = (event: Event) => {
  const target = event.target as HTMLElement;
  const dropdown = document.querySelector('.language-dropdown');
  const selector = document.querySelector('.language-selector');

  if (dropdown && selector && !dropdown.contains(target) && !selector.contains(target)) {
    isLanguageDropdownOpen.value = false;
  }
};

// 阻止搜索输入框点击事件冒泡，防止关闭下拉菜单
const stopPropagation = (event: Event) => {
  event.stopPropagation();
};

// 显示设置成功的反馈
const feedbackItems = ref(new Map<string, boolean>());

const showFeedback = (settingType: string) => {
  feedbackItems.value.set(settingType, true);
  setTimeout(() => {
    feedbackItems.value.set(settingType, false);
  }, 2000);
};

// 主题图标映射
const themeIcons: Record<string, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
};

// 更新相关状态
const isCheckingUpdate = ref(false);
const updateAvailable = ref(false);
const updateError = ref('');
const lastCheckTime = ref<string>('');
const availableVersion = ref<string>('');
const releaseNotes = ref<string>('');
const hasCheckedOnce = ref(false);

// 下载进度相关状态
const isDownloading = ref(false);
const downloadProgress = ref(0);
const downloadedBytes = ref(0);
const totalBytes = ref(0);
const downloadStatus = ref<'idle' | 'downloading' | 'installing' | 'completed' | 'error'>('idle');
const updateInstance = ref<Update | null>(null);
const UPDATE_STATE_KEY = 'sftool.updateState';

const hydrateUpdateState = () => {
  try {
    const raw = sessionStorage.getItem(UPDATE_STATE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { status?: string; version?: string; releaseNotes?: string };
    if (data?.status === 'completed') {
      downloadStatus.value = 'completed';
      if (data.version) availableVersion.value = data.version;
      if (data.releaseNotes) releaseNotes.value = data.releaseNotes;
      updateAvailable.value = true;
    }
  } catch {
    sessionStorage.removeItem(UPDATE_STATE_KEY);
  }
};

const persistUpdateState = () => {
  if (downloadStatus.value === 'completed') {
    sessionStorage.setItem(
      UPDATE_STATE_KEY,
      JSON.stringify({
        status: 'completed',
        version: availableVersion.value,
        releaseNotes: releaseNotes.value,
      })
    );
  } else {
    sessionStorage.removeItem(UPDATE_STATE_KEY);
  }
};

// 格式化文件大小
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 检查更新
const checkForUpdates = async () => {
  if (isCheckingUpdate.value) return;
  isCheckingUpdate.value = true;
  updateError.value = '';

  try {
    const update = await check();
    lastCheckTime.value = new Date().toLocaleTimeString();

    if (update) {
      updateAvailable.value = true;
      availableVersion.value = update.version || '';
      releaseNotes.value = update.body || '';
      updateInstance.value = markRaw(update);
    } else {
      updateAvailable.value = false;
      availableVersion.value = '';
      releaseNotes.value = '';
      updateInstance.value = null;
    }
  } catch (error: any) {
    updateError.value = error?.message || String(error);
  } finally {
    isCheckingUpdate.value = false;
    hasCheckedOnce.value = true;
  }
};

// 下载并安装更新
const downloadAndInstallUpdate = async () => {
  if (!updateInstance.value || isDownloading.value) return;
  isDownloading.value = true;
  downloadStatus.value = 'downloading';
  downloadProgress.value = 0;
  downloadedBytes.value = 0;
  totalBytes.value = 0;

  try {
    await updateInstance.value.downloadAndInstall(event => {
      console.log('Update event:', event);
      switch (event.event) {
        case 'Started':
          totalBytes.value = event.data.contentLength || 0;
          console.log(`Started downloading ${totalBytes.value} bytes`);
          break;
        case 'Progress':
          downloadedBytes.value += event.data.chunkLength;
          if (totalBytes.value > 0) {
            downloadProgress.value = Math.min(100, (downloadedBytes.value / totalBytes.value) * 100);
          }
          break;
        case 'Finished':
          downloadProgress.value = 100;
          downloadStatus.value = 'installing';
          console.log('Download finished, installing...');
          break;
      }
    });

    // 下载安装完成
    downloadStatus.value = 'completed';
    persistUpdateState();
  } catch (error: any) {
    downloadStatus.value = 'error';
    updateError.value = error?.message || String(error);
    console.error('Update failed:', error);
  } finally {
    isDownloading.value = false;
  }
};

// 重启应用
const restartApp = async () => {
  try {
    sessionStorage.removeItem(UPDATE_STATE_KEY);
    await relaunch();
  } catch (error) {
    console.error('Failed to relaunch:', error);
  }
};

// 重置更新状态
const resetUpdateState = () => {
  downloadStatus.value = 'completed';
  downloadProgress.value = 0;
  downloadedBytes.value = 0;
  totalBytes.value = 0;
  updateError.value = '';
  sessionStorage.removeItem(UPDATE_STATE_KEY);
};

// 监听点击事件，用于关闭下拉菜单 + 启动时检查更新
onMounted(() => {
  document.addEventListener('click', closeLanguageDropdown);
  hydrateUpdateState();
  checkForUpdates();
});
</script>

<template>
  <div class="p-6 w-full min-h-screen">
    <div class="flex items-center mb-10">
      <span class="material-icons text-4xl mr-3 text-primary">settings</span>
      <h1 class="text-4xl font-bold">{{ $t('setting.title') }}</h1>
    </div>

    <div class="space-y-12">
      <!-- 主题设置 -->
      <section>
        <div class="mb-6 flex items-center">
          <span class="material-icons text-2xl mr-3 text-primary">palette</span>
          <h2 class="text-2xl font-semibold">{{ $t('setting.theme') }}</h2>
          <div
            class="ml-auto transition-all duration-300"
            :class="{ 'opacity-100': feedbackItems.get('theme'), 'opacity-0': !feedbackItems.get('theme') }"
          >
            <span class="inline-flex items-center px-3 py-1 bg-success/20 text-success rounded-full">
              <span class="material-icons text-sm mr-1">check_circle</span>
              <span>{{ $t('setting.feedback_applied') }}</span>
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="theme in ['light', 'dark', 'system']"
            :key="theme"
            class="theme-card"
            :class="{ active: activeTheme === theme }"
            @click="updateTheme(theme as ThemeType)"
          >
            <div class="theme-icon" :class="`theme-${theme}`">
              <span class="text-2xl">{{ themeIcons[theme] }}</span>
            </div>
            <div class="theme-info">
              <h3 class="text-lg font-medium">{{ $t(`setting.theme_options.${theme}`) }}</h3>
              <div class="theme-check">
                <span class="material-icons check-icon" :class="{ visible: activeTheme === theme }">
                  check_circle
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 应用更新 -->
      <section>
        <div class="mb-6 flex items-center">
          <span class="material-icons text-2xl mr-3 text-primary">system_update</span>
          <h2 class="text-2xl font-semibold">{{ $t('setting.update') }}</h2>
          <div v-if="updateAvailable && downloadStatus === 'idle'" class="ml-auto">
            <span class="inline-flex items-center px-3 py-1 bg-success/20 text-success rounded-full text-sm">
              <span class="material-icons text-sm mr-1">new_releases</span>
              {{ $t('setting.new_version_found') }} {{ availableVersion }}
            </span>
          </div>
        </div>

        <div class="card bg-base-200 shadow-sm overflow-hidden">
          <!-- 版本检查区域 -->
          <div class="p-4 flex items-center justify-between border-b border-base-300/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-base-300/50 flex items-center justify-center">
                <span class="material-icons text-base-content/70">update</span>
              </div>
              <div>
                <div class="font-medium text-base">{{ $t('setting.version_check') }}</div>
                <div class="text-sm text-base-content/60">
                  {{
                    lastCheckTime
                      ? `${$t('setting.last_check')}：${lastCheckTime}`
                      : $t('setting.auto_check_on_startup')
                  }}
                </div>
              </div>
            </div>
            <button
              class="btn btn-primary btn-sm gap-2 min-w-[100px]"
              :disabled="isCheckingUpdate || isDownloading"
              @click="checkForUpdates"
            >
              <span v-if="isCheckingUpdate" class="loading loading-spinner loading-xs"></span>
              <span v-else class="material-icons text-sm">refresh</span>
              {{ $t('setting.manual_check') }}
            </button>
          </div>

          <!-- 更新完成提示 -->
          <div v-if="downloadStatus === 'completed'" class="p-4 bg-success/10">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <span class="material-icons text-success text-2xl">check_circle</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-lg text-success">{{ $t('setting.update_completed') }}</span>
                </div>
                <p class="text-sm text-base-content/70 mb-3">{{ $t('setting.update_completed_hint') }}</p>
                <div class="flex gap-2">
                  <button class="btn btn-success gap-2" @click="restartApp">
                    <span class="material-icons">restart_alt</span>
                    {{ $t('setting.restart_now') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 下载进度显示 -->
          <div
            v-else-if="downloadStatus === 'downloading' || downloadStatus === 'installing'"
            class="p-4 bg-primary/10"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span
                  v-if="downloadStatus === 'downloading'"
                  class="loading loading-spinner loading-md text-primary"
                ></span>
                <span v-else class="material-icons text-primary text-2xl animate-pulse">install_desktop</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-bold text-lg text-primary">
                    {{ downloadStatus === 'downloading' ? $t('setting.downloading') : $t('setting.installing') }}
                  </span>
                  <span class="text-sm text-base-content/70">{{ availableVersion }}</span>
                </div>

                <!-- 进度条 -->
                <div class="w-full mb-2">
                  <div class="flex justify-between text-sm text-base-content/70 mb-1">
                    <span>{{ formatBytes(downloadedBytes) }} / {{ formatBytes(totalBytes) }}</span>
                    <span>{{ Math.round(downloadProgress) }}%</span>
                  </div>
                  <div class="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
                    <div
                      class="h-2.5 rounded-full transition-all duration-300 ease-out"
                      :class="downloadStatus === 'installing' ? 'bg-success animate-pulse' : 'bg-primary'"
                      :style="{ width: `${downloadProgress}%` }"
                    ></div>
                  </div>
                </div>

                <p class="text-sm text-base-content/60">
                  {{
                    downloadStatus === 'downloading' ? $t('setting.downloading_hint') : $t('setting.installing_hint')
                  }}
                </p>
              </div>
            </div>
          </div>

          <!-- 更新可用时显示 -->
          <div v-else-if="updateAvailable" class="p-4 bg-success/10">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <span class="material-icons text-success text-2xl">rocket_launch</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-lg text-success"
                    >{{ $t('setting.new_version_found') }} {{ availableVersion }}</span
                  >
                </div>
                <p class="text-sm text-base-content/70 mb-3">{{ $t('setting.update_available_hint') }}</p>
                <pre
                  v-if="releaseNotes"
                  class="text-sm whitespace-pre-wrap max-h-32 overflow-auto w-full bg-base-100/50 rounded-lg p-3 mb-3 text-base-content/80"
                  >{{ releaseNotes }}</pre
                >
                <button class="btn btn-success gap-2" :disabled="isDownloading" @click="downloadAndInstallUpdate">
                  <span v-if="isDownloading" class="loading loading-spinner loading-sm"></span>
                  <span v-else class="material-icons">download</span>
                  {{ $t('setting.download_and_install') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 下载错误显示 -->
          <div v-else-if="downloadStatus === 'error'" class="p-4 bg-error/10">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                <span class="material-icons text-error text-2xl">error</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-lg text-error">{{ $t('setting.update_failed') }}</span>
                </div>
                <p class="text-sm text-base-content/70 mb-3">{{ updateError }}</p>
                <button class="btn btn-error btn-outline gap-2" @click="resetUpdateState">
                  <span class="material-icons">refresh</span>
                  {{ $t('setting.retry') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 无更新或错误时显示 -->
          <div v-else class="p-4">
            <div v-if="updateError" class="flex items-center gap-3 text-error">
              <span class="material-icons">error_outline</span>
              <span class="text-sm">{{ $t('setting.update_check_failed') }}：{{ updateError }}</span>
            </div>
            <div v-else-if="hasCheckedOnce" class="flex items-center gap-3 text-base-content/60">
              <span class="material-icons text-success">check_circle</span>
              <span class="text-sm">{{ $t('setting.already_latest') }}</span>
            </div>
            <div v-else class="flex items-center gap-3 text-base-content/60">
              <span class="material-icons">info</span>
              <span class="text-sm">{{ $t('setting.startup_checked') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 语言设置 - 重新设计 -->
      <section>
        <div class="mb-6 flex items-center">
          <span class="material-icons text-2xl mr-3 text-primary">translate</span>
          <h2 class="text-2xl font-semibold">{{ $t('setting.language') }}</h2>
          <div
            class="ml-auto transition-all duration-300"
            :class="{ 'opacity-100': feedbackItems.get('language'), 'opacity-0': !feedbackItems.get('language') }"
          >
            <span class="inline-flex items-center px-3 py-1 bg-success/20 text-success rounded-full">
              <span class="material-icons text-sm mr-1">check_circle</span>
              <span>{{ $t('setting.feedback_applied') }}</span>
            </span>
          </div>
        </div>

        <div class="relative z-10 w-full">
          <!-- 语言选择器 -->
          <div class="language-selector" @click="toggleLanguageDropdown">
            <div class="flex items-center">
              <div class="lang-char-container mr-3">
                <div class="lang-char">
                  <span class="lang-char-text">{{ currentLanguage.langChar }}</span>
                </div>
              </div>
              <div class="language-info flex-grow">
                <div class="language-name font-medium">{{ currentLanguage.nativeName }}</div>
                <div class="language-english text-sm text-base-content/70">{{ currentLanguage.englishName }}</div>
              </div>
              <div class="language-arrow transition-transform" :class="{ 'rotate-180': isLanguageDropdownOpen }">
                <span class="material-icons">expand_more</span>
              </div>
            </div>
          </div>

          <!-- 语言下拉菜单，添加animation效果 -->
          <transition name="dropdown">
            <div v-if="isLanguageDropdownOpen" class="language-dropdown">
              <div class="dropdown-header">
                <span class="material-icons text-sm mr-1">language</span>
                <span class="text-sm font-medium">{{ $t('setting.language_selector') }}</span>
              </div>

              <!-- 搜索框 -->
              <div class="language-search">
                <div class="relative">
                  <input
                    type="text"
                    class="language-search-input w-full py-2 pl-10 pr-4 border-b border-base-300 focus:outline-none focus:border-primary"
                    :placeholder="$t('setting.search_language')"
                    v-model="searchQuery"
                    @click="stopPropagation"
                  />
                  <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-base-content/50"
                    >search</span
                  >
                </div>
              </div>

              <!-- 语言列表 -->
              <div class="dropdown-items">
                <div
                  v-for="language in filteredLanguages"
                  :key="language.code"
                  class="dropdown-item"
                  :class="{ active: activeLanguage === language.code }"
                  @click="updateLanguage(language.code)"
                >
                  <div class="lang-char-container mr-3">
                    <div class="lang-char">
                      <span class="lang-char-text">{{ language.langChar }}</span>
                    </div>
                  </div>
                  <div class="language-info flex-grow">
                    <div class="language-name font-medium">{{ language.nativeName }}</div>
                    <div class="language-english text-sm text-base-content/70">{{ language.englishName }}</div>
                  </div>
                  <span v-if="activeLanguage === language.code" class="material-icons text-primary">check</span>
                </div>

                <!-- 没有匹配结果时显示提示 -->
                <div v-if="filteredLanguages.length === 0" class="empty-result">
                  <p class="text-center py-4 text-base-content/70">{{ $t('setting.no_language_match') }}</p>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 禁止整个设置页面的文本选择 */
.p-6 {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* 允许搜索框可选择 */
.language-search-input {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}

.theme-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  border-radius: 1rem;
  background-color: hsl(var(--b1));
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.theme-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.theme-card.active {
  border-color: hsl(var(--p));
  background-color: hsl(var(--p) / 0.1);
}

.theme-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  background-color: hsl(var(--b2));
}

.theme-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-check {
  display: flex;
  align-items: center;
}

.check-icon {
  color: hsl(var(--p));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.check-icon.visible {
  opacity: 1;
}

.theme-light {
  background-color: #f8fafc;
  color: #0f172a;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.theme-dark {
  background-color: #0f172a;
  color: #f8fafc;
}

.theme-system {
  background: linear-gradient(to right, #f8fafc 50%, #0f172a 50%);
  color: #52b0e1;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

/* 新的语言选择器样式 */
.language-selector {
  background-color: hsl(var(--b1));
  border: 2px solid hsl(var(--b2));
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  position: relative;
}

.language-selector:hover {
  border-color: hsl(var(--p) / 0.5);
  box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.1);
}

.language-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  width: 100%;
  background-color: hsl(var(--b1));
  border-radius: 1rem;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid hsl(var(--b2));
  overflow: hidden;
  z-index: 20;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 语言搜索框样式 */
.language-search {
  padding: 0.5rem;
  background-color: hsl(var(--b1));
  border-bottom: 1px solid hsl(var(--b2));
}

.language-search-input {
  background-color: hsl(var(--b1));
  color: hsl(var(--bc));
}

.language-search-input:focus {
  background-color: hsl(var(--b2));
}

/* 下拉内容区 */
.dropdown-header {
  padding: 0.75rem 1rem;
  background-color: hsl(var(--b2));
  color: hsl(var(--bc));
  display: flex;
  align-items: center;
  border-bottom: 1px solid hsl(var(--b3));
}

.dropdown-items {
  max-height: 250px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: hsl(var(--b2));
}

.dropdown-item.active {
  background-color: hsl(var(--p) / 0.1);
  color: hsl(var(--p));
}

.language-arrow {
  color: hsl(var(--bc) / 0.6);
  transition: transform 0.3s;
}

/* 新的语言字符样式 */
.lang-char-container {
  width: 24px;
  height: 24px;
  position: relative;
  overflow: hidden;
}

.lang-char {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: hsl(var(--p) / 0.1);
  color: hsl(var(--p));
}

.lang-char-text {
  font-size: 1rem;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* 动画效果 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

.active {
  animation: pulse 2s ease-in-out 1;
}

/* 滚动条样式 */
.dropdown-items::-webkit-scrollbar {
  width: 6px;
}

.dropdown-items::-webkit-scrollbar-track {
  background: hsl(var(--b2));
  border-radius: 10px;
}

.dropdown-items::-webkit-scrollbar-thumb {
  background: hsl(var(--p) / 0.3);
  border-radius: 10px;
}

.dropdown-items::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--p) / 0.5);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-card {
    padding: 1rem;
  }

  .theme-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.dropdown-item,
.dropdown-header,
.language-selector,
.theme-card,
.theme-info,
.theme-icon,
.lang-char-container,
.language-info,
.language-name,
.language-english,
.material-icons,
.dropdown-items {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
</style>
