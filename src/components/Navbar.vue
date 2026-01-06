<template>
  <nav
    :class="`bg-base-100 shadow-md h-screen sticky left-0 top-0 transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`"
  >
    <!-- 导航菜单（包含展开/收起按钮和页面导航） -->
    <div class="flex-grow overflow-y-auto p-2">
      <ul class="space-y-3">
        <!-- 展开/收起按钮作为第一个导航项 -->
        <li class="mb-1">
          <button @click="toggleNavbar" class="toggle-btn nav-item">
            <div class="icon-box">
              <span class="material-icons">{{ isCollapsed ? 'menu' : 'menu_open' }}</span>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ isCollapsed ? '' : $t('navbar.collapse_menu') }}
            </span>
          </button>
        </li>

        <!-- 页面导航菜单 -->
        <li>
          <router-link to="/write-flash" class="nav-item">
            <div class="icon-box">
              <span class="material-icons">memory</span>
              <div v-if="isCollapsed" class="tooltip">{{ $t('navbar.flash') }}</div>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ $t('navbar.flash') }}
            </span>
          </router-link>
        </li>
        <li>
          <router-link to="/read-flash" class="nav-item">
            <div class="icon-box">
              <span class="material-icons">file_upload</span>
              <div v-if="isCollapsed" class="tooltip">{{ $t('navbar.read_flash') }}</div>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ $t('navbar.read_flash') }}
            </span>
          </router-link>
        </li>
        <li>
          <router-link to="/erase-flash" class="nav-item">
            <div class="icon-box">
              <span class="material-icons">delete_forever</span>
              <div v-if="isCollapsed" class="tooltip">{{ $t('navbar.erase_flash') }}</div>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ $t('navbar.erase_flash') }}
            </span>
          </router-link>
        </li>
        <li>
          <router-link to="/stubconfig" class="nav-item">
            <div class="icon-box">
              <span class="material-icons">build</span>
              <div v-if="isCollapsed" class="tooltip">{{ $t('navbar.stub_config') }}</div>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ $t('navbar.stub_config') }}
            </span>
          </router-link>
        </li>
        <li>
          <router-link to="/setting" class="nav-item">
            <div class="icon-box">
              <span class="material-icons">settings</span>
              <div v-if="isCollapsed" class="tooltip">{{ $t('navbar.setting') }}</div>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ $t('navbar.setting') }}
            </span>
          </router-link>
        </li>
        <li>
          <router-link to="/about" class="nav-item">
            <div class="icon-box">
              <span class="material-icons">help_outline</span>
              <div v-if="isCollapsed" class="tooltip">{{ $t('navbar.about') }}</div>
            </div>
            <span class="label" :class="{ 'hidden-label': isCollapsed }">
              {{ $t('navbar.about') }}
            </span>
          </router-link>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useUserStore } from '../stores/userStore.ts';
import { ref, onMounted } from 'vue';

const userStore = useUserStore();

// 导航栏折叠状态，使用userStore的状态
const isCollapsed = ref(userStore.menuCollapsed);

// 切换导航栏展开/收起状态
const toggleNavbar = async () => {
  isCollapsed.value = !isCollapsed.value;
  // 保存折叠状态到userStore
  await userStore.setMenuCollapsed(isCollapsed.value);
  // 触发自定义事件，通知App.vue导航栏状态已更改
  window.dispatchEvent(new Event('navbarStateChanged'));
};

// 初始化导航栏状态
onMounted(() => {
  isCollapsed.value = userStore.menuCollapsed;
});
</script>

<style scoped>
/* 导航项基本样式 */
.nav-item {
  position: relative;
  display: block;
  height: 48px;
  border-radius: 0.75rem;
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  width: 100%;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    color 0.3s ease;
  cursor: pointer;
  background: none;
  border: none;
  text-align: left;
  padding: 0;
  user-select: none; /* 防止导航项内容被选中 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 切换按钮特殊样式 */
.toggle-btn {
  font-family: inherit;
  outline: none;
}

/* 图标盒子样式 - 使用绝对定位固定在左侧 */
.icon-box {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图标样式 */
.material-icons {
  font-size: 24px;
  transition:
    transform 0.2s,
    color 0.3s;
  user-select: none; /* 防止文本被选中 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  pointer-events: none; /* 防止图标响应鼠标事件 */
  -webkit-user-drag: none; /* 防止拖拽 */
}

/* 标签文本样式 */
.label {
  display: block;
  position: absolute;
  left: 48px;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  transition: opacity 0.3s;
  opacity: 1;
  user-select: none; /* 防止文本被选中 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.hidden-label {
  opacity: 0;
}

/* 弱化的强调色，用于鼠标悬停状态 */
.nav-item:hover,
.toggle-btn:hover {
  background-color: rgba(82, 176, 225, 0.2) !important;
  color: #52b0e1 !important;
  box-shadow: 0 0 0 1px rgba(82, 176, 225, 0.3) !important;
}

/* 强调色，用于当前选中的页面 */
.nav-item.router-link-active {
  background-color: rgba(82, 176, 225, 0.3) !important;
  color: #52b0e1 !important;
  font-weight: 500 !important;
  box-shadow:
    0 0 0 2px rgba(82, 176, 225, 0.5) !important,
    inset 4px 0 0 #52b0e1 !important,
    0 4px 8px rgba(0, 0, 0, 0.1) !important;
}

/* 悬停和激活状态下的图标效果 */
.nav-item:hover .material-icons,
.toggle-btn:hover .material-icons {
  color: #52b0e1 !important;
}

.nav-item.router-link-active .material-icons {
  color: #52b0e1 !important;
  transform: scale(1.15);
  text-shadow: 0 0 8px rgba(82, 176, 225, 0.5);
}

/* 提示框样式 */
.tooltip {
  position: absolute;
  left: 48px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #52b0e1 !important;
  color: white !important;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  box-shadow: 0 3px 10px rgba(82, 176, 225, 0.4);
  font-weight: normal;
  visibility: hidden;
}

.icon-box:hover .tooltip {
  opacity: 1;
  visibility: visible;
}

/* 确保在暗黑模式下颜色仍然可见 */
@media (prefers-color-scheme: dark) {
  .nav-item:hover,
  .toggle-btn:hover,
  .nav-item.router-link-active {
    background-color: rgba(94, 184, 232, 0.25) !important;
    color: #5eb8e8 !important;
  }

  .nav-item:hover .material-icons,
  .toggle-btn:hover .material-icons,
  .nav-item.router-link-active .material-icons {
    color: #5eb8e8 !important;
  }

  .nav-item.router-link-active {
    box-shadow:
      0 0 0 2px rgba(94, 184, 232, 0.5) !important,
      inset 4px 0 0 #5eb8e8 !important,
      0 4px 8px rgba(0, 0, 0, 0.2) !important;
  }

  .tooltip {
    background-color: #3a9ed4 !important;
  }
}

/* 添加禁用导航项样式 */
.disabled-nav-item {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.disabled-nav-item:hover {
  background-color: transparent !important;
  color: inherit !important;
  box-shadow: none !important;
}

.disabled-nav-item .material-icons {
  color: inherit !important;
  transform: none !important;
}
</style>
