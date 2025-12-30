<template>
  <div class="fixed z-50 log-floating-container" :class="{ 'has-device-panel': hasDevicePanel }">
    <!-- 优化的日志预览卡片 -->
    <div
      class="log-card bg-gradient-to-br from-base-100 to-base-200 rounded-2xl shadow-2xl border border-base-300/50 backdrop-blur-sm cursor-pointer hover:shadow-3xl transition-all duration-300 hover:scale-105 group overflow-hidden"
      @click="openLogWindow"
    >
      <!-- 顶部装饰条 -->
      <div class="h-1 w-full transition-all duration-300" :class="getTopBarClass()"></div>

      <div class="px-4 py-3 lg:px-5 lg:py-4">
        <div class="flex items-center gap-3 lg:gap-4">
          <!-- 优化的状态指示器 -->
          <div class="flex-shrink-0">
            <div
              class="w-3 h-3 lg:w-4 lg:h-4 rounded-full shadow-lg transition-all duration-300"
              :class="getStatusClass()"
            ></div>
          </div>

          <!-- 日志信息区域 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
              <span class="text-xs lg:text-sm font-semibold text-base-content/90 tracking-wide"> 系统日志 </span>
              <!-- 消息数量徽章 -->
              <div
                class="px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full text-xs font-medium transition-all duration-300"
                :class="
                  logStore.messages.length > 0
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-base-300/50 text-base-content/60'
                "
              >
                {{ logStore.messages.length }}
              </div>
            </div>

            <!-- 最新消息预览 -->
            <div class="text-xs leading-relaxed" v-if="logStore.latestMessage">
              <div class="text-base-content/70 line-clamp-1 lg:line-clamp-2">
                {{ formatMessage(logStore.latestMessage) }}
              </div>
            </div>
            <div class="text-xs text-base-content/50 italic" v-else>等待日志消息...</div>
          </div>

          <!-- 打开图标 -->
          <div class="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
            <div
              class="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3 lg:h-4 lg:w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </div>
        </div>

        <!-- 状态文本 - 在小屏幕上隐藏或简化 -->
        <div class="mt-2 pt-2 lg:mt-3 lg:pt-3 border-t border-base-300/30 hidden lg:block">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium" :class="getStatusTextClass()">
              {{ getStatusText() }}
            </span>
            <span class="text-xs text-base-content/40"> 点击打开窗口 </span>
          </div>
        </div>

        <!-- 小屏幕状态指示 -->
        <div class="mt-2 lg:hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium" :class="getStatusTextClass()">
              {{ getSimpleStatusText() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLogStore } from '../stores/logStore';
import { WindowManager } from '../services/windowManager';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const logStore = useLogStore();
const route = useRoute();

// 检查是否显示设备连接面板
const hasDevicePanel = computed(() => {
  switch (route.path) {
    case '/setting':
    case '/about':
      return false;
    default:
      return true;
  }
});

// 计算状态类
const getStatusClass = () => {
  if (logStore.hasErrors) {
    return 'bg-error shadow-error/50 animate-pulse';
  } else if (logStore.isFlashing) {
    return 'bg-success shadow-success/50 animate-pulse';
  } else {
    return 'bg-info shadow-info/50';
  }
};

// 获取顶部装饰条样式
const getTopBarClass = () => {
  if (logStore.hasErrors) {
    return 'bg-gradient-to-r from-error/70 via-error to-error/70';
  } else if (logStore.isFlashing) {
    return 'bg-gradient-to-r from-success/70 via-success to-success/70';
  } else {
    return 'bg-gradient-to-r from-info/70 via-info to-info/70';
  }
};

// 获取状态文本样式
const getStatusTextClass = () => {
  if (logStore.hasErrors) {
    return 'text-error font-medium';
  } else if (logStore.isFlashing) {
    return 'text-success font-medium';
  } else {
    return 'text-info';
  }
};

// 获取状态文本
const getStatusText = () => {
  if (logStore.hasErrors) {
    return '⚠️ 发现错误';
  } else if (logStore.isFlashing) {
    return '⚡ 烧录进行中';
  } else {
    return '✨ 系统就绪';
  }
};

// 获取简化状态文本（用于小屏幕）
const getSimpleStatusText = () => {
  if (logStore.hasErrors) {
    return '❌ 错误';
  } else if (logStore.isFlashing) {
    return '🔄 烧录中';
  } else {
    return '✅ 就绪';
  }
};

// 格式化消息用于预览
const formatMessage = (message: string) => {
  // 移除时间戳前缀，只显示消息内容
  let cleaned = message.replace(/^\[[\d:]+\]\s*/, '');
  // 如果消息太长，进行智能截断
  if (cleaned.length > 80) {
    // 尝试在句号、逗号或空格处截断
    const cutPoint = cleaned.substring(0, 80).lastIndexOf(' ');
    if (cutPoint > 50) {
      return cleaned.substring(0, cutPoint) + '...';
    } else {
      return cleaned.substring(0, 77) + '...';
    }
  }
  return cleaned;
};

// 打开日志窗口
const openLogWindow = async () => {
  try {
    await WindowManager.openLogWindow();
  } catch (error) {
    console.error('打开日志窗口失败:', error);
    logStore.addMessage('打开日志窗口失败: ' + error, true);
  }
};
</script>

<style scoped>
/* 响应式浮动按钮定位 */
.log-floating-container {
  /* 默认定位（viewport右下角） */
  bottom: 1.5rem;
  right: 1.5rem;
}

/* 当存在设备面板时，使用不同的定位策略 */
.log-floating-container.has-device-panel {
  /* 相对于主内容区域定位，而不是viewport */
  position: fixed;
  bottom: 1.5rem;
  /* 计算位置：设备面板宽度大约在280-320px之间 */
  right: 330px;
  /* 使用 transform 确保不会太靠左 */
  transform: translateX(0);
}

/* 大屏幕优化 */
@media (min-width: 1280px) {
  .log-floating-container.has-device-panel {
    right: 350px; /* 更大屏幕，设备面板可能更宽 */
  }
}

/* 中等屏幕优化 */
@media (max-width: 1024px) {
  .log-floating-container {
    bottom: 1rem;
    right: 1rem;
  }

  .log-floating-container.has-device-panel {
    right: 300px;
  }
}

/* 小屏幕优化 - 回到简单的左右切换策略 */
@media (max-width: 768px) {
  .log-floating-container {
    bottom: 0.75rem;
    right: 0.75rem;
  }

  /* 小屏幕时可能设备面板被隐藏，或者使用抽屉式布局 */
  .log-floating-container.has-device-panel {
    right: 0.75rem; /* 恢复右下角 */
    bottom: 4rem; /* 但给底部更多空间 */
  }

  .log-card {
    max-width: 200px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 640px) {
  .log-floating-container {
    bottom: 0.5rem;
    right: 0.5rem;
  }

  .log-card {
    max-width: 180px;
  }
}

/* 特别小的屏幕，避免遮挡 */
@media (max-width: 480px) {
  .log-floating-container {
    bottom: 4rem; /* 给底部更多空间 */
    right: 0.5rem;
  }

  .log-card {
    max-width: 160px;
  }
}

/* 浮动按钮的入场动画 */
.log-floating-container {
  animation: slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 悬停效果 */
.cursor-pointer:hover {
  transform: translateY(-4px);
}

/* 多行文本截断 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 增强阴影效果 */
.shadow-3xl {
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* 状态指示器阴影 */
.shadow-error\/50 {
  box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.5);
}

.shadow-success\/50 {
  box-shadow: 0 4px 14px 0 rgba(34, 197, 94, 0.5);
}

.shadow-info\/50 {
  box-shadow: 0 4px 14px 0 rgba(82, 176, 225, 0.5);
}

/* 深色主题优化 */
@media (prefers-color-scheme: dark) {
  .shadow-3xl {
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05);
  }
}
</style>
