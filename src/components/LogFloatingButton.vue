<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
    <!-- 日志状态指示器和快速预览 -->
    <div 
      class="bg-base-100 rounded-xl shadow-lg border border-base-300 px-4 py-3 max-w-sm cursor-pointer hover:shadow-xl transition-all duration-200"
      @click="openLogWindow"
    >
      <div class="flex items-center gap-3">
        <!-- 状态指示灯 -->
        <div 
          class="w-3 h-3 rounded-full flex-shrink-0"
          :class="getStatusClass()"
        ></div>
        
        <!-- 日志信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-base-content">
              日志
            </span>
            <div class="badge badge-sm" :class="logStore.messages.length > 0 ? 'badge-primary' : 'badge-ghost'">
              {{ logStore.messages.length }}
            </div>
          </div>
          
          <!-- 最新消息预览 -->
          <div class="text-xs text-base-content/60 truncate" v-if="logStore.latestMessage">
            {{ formatMessage(logStore.latestMessage) }}
          </div>
          <div class="text-xs text-base-content/40" v-else>
            暂无日志消息
          </div>
        </div>
        
        <!-- 打开窗口图标 -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </div>
    
    <!-- 快捷操作按钮组 -->
    <div class="flex gap-2 justify-end">
      <!-- 清除日志按钮 -->
      <div class="tooltip tooltip-left" data-tip="清除日志">
        <button 
          class="btn btn-sm btn-circle btn-outline hover:btn-error"
          @click="clearLogs"
          :disabled="logStore.isFlashing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      <!-- 打开日志窗口按钮 -->
      <div class="tooltip tooltip-left" data-tip="打开日志窗口">
        <button 
          class="btn btn-sm btn-circle btn-primary"
          @click="openLogWindow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLogStore } from '../stores/logStore';
import { WindowManager } from '../services/windowManager';

const logStore = useLogStore();

// 计算状态类
const getStatusClass = () => {
  if (logStore.hasErrors) {
    return 'bg-error animate-pulse';
  } else if (logStore.isFlashing) {
    return 'bg-success animate-pulse';
  } else {
    return 'bg-info';
  }
};

// 格式化消息用于预览
const formatMessage = (message: string) => {
  // 移除时间戳前缀，只显示消息内容
  return message.replace(/^\[[\d:]+\]\s*/, '');
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

// 清除日志
const clearLogs = () => {
  logStore.clearLogs();
};
</script>

<style scoped>
/* 浮动按钮的入场动画 */
.fixed {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 悬停效果 */
.cursor-pointer:hover {
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 640px) {
  .max-w-sm {
    max-width: 16rem;
  }
}
</style>
