<template>
  <div class="h-screen bg-base-100 flex flex-col overflow-hidden">
    <!-- 窗口头部 -->
    <div class="flex items-center justify-between p-4 border-b border-base-300 bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full" :class="logStore.isFlashing ? 'bg-success animate-pulse' : 'bg-base-300'"></div>
        <h1 class="text-lg font-semibold text-base-content">
          {{ $t('writeFlash.logLabel') }}
        </h1>
        <div class="badge badge-sm" :class="logStore.messages.length > 0 ? 'badge-primary' : 'badge-ghost'">
          {{ logStore.messages.length }}
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- 自动滚动切换 -->
        <div class="tooltip tooltip-bottom" data-tip="自动滚动">
          <button 
            class="btn btn-sm btn-circle btn-ghost"
            :class="{ 'btn-active': autoScroll }"
            @click="toggleAutoScroll"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
        
        <!-- 日志级别过滤 -->
        <div class="dropdown dropdown-bottom dropdown-end">
          <div tabindex="0" role="button" class="btn btn-sm btn-circle btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
            <li>
              <a @click="setLogLevel('all')" :class="{ 'active': logLevel === 'all' }">
                显示全部
              </a>
            </li>
            <li>
              <a @click="setLogLevel('info')" :class="{ 'active': logLevel === 'info' }">
                仅信息
              </a>
            </li>
            <li>
              <a @click="setLogLevel('error')" :class="{ 'active': logLevel === 'error' }">
                仅错误
              </a>
            </li>
          </ul>
        </div>
        
        <!-- 清除日志 -->
        <div class="tooltip tooltip-bottom" data-tip="清除日志">
          <button 
            class="btn btn-sm btn-circle btn-ghost"
            @click="clearLogs"
            :disabled="logStore.isFlashing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        <!-- 导出日志 -->
        <div class="tooltip tooltip-bottom" data-tip="导出日志">
          <button 
            class="btn btn-sm btn-circle btn-ghost"
            @click="exportLogs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
        
        <!-- 置顶切换 -->
        <div class="tooltip tooltip-bottom" data-tip="窗口置顶">
          <button 
            class="btn btn-sm btn-circle btn-ghost"
            :class="{ 'btn-active': alwaysOnTop }"
            @click="toggleAlwaysOnTop"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 日志内容区域 -->
    <div class="flex-1 overflow-hidden p-4">
      <div 
        ref="logContainer"
        class="h-full overflow-y-auto font-mono text-sm leading-relaxed scrollable-container bg-base-200 rounded-lg p-4"
      >
        <div v-if="filteredLogMessages.length === 0" class="text-center text-base-content/60 py-8">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>暂无日志消息</p>
        </div>
        <div v-else>
          <!-- 日志消息列表 -->
          <div 
            v-for="(message, index) in filteredLogMessages" 
            :key="index"
            class="mb-2 py-2 px-3 rounded hover:bg-base-300/50 transition-colors group border-l-2"
            :class="getLogMessageClass(message)"
          >
            <div class="flex items-start gap-3">
              <!-- 日志级别指示器 -->
              <div 
                class="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                :class="getLogLevelIndicator(message)"
              ></div>
              
              <!-- 日志内容 -->
              <pre class="flex-1 whitespace-pre-wrap break-words text-sm">{{ message }}</pre>
              
              <!-- 复制按钮 -->
              <button 
                class="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                @click="copyLogMessage(message)"
                title="复制这条日志"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 窗口底部状态栏 -->
    <div class="flex items-center justify-between px-4 py-3 border-t border-base-300 bg-base-50 text-xs text-base-content/60 flex-shrink-0">
      <div class="flex items-center gap-4">
        <span>总消息: {{ logStore.messages.length }}</span>
        <span v-if="logLevel !== 'all'">已过滤: {{ filteredLogMessages.length }}</span>
      </div>
      
      <div class="flex items-center gap-2">
        <span v-if="logStore.isFlashing" class="text-success flex items-center gap-1">
          <div class="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          烧录进行中
        </span>
        <span v-else class="flex items-center gap-1">
          <div class="w-2 h-2 bg-base-content/40 rounded-full"></div>
          就绪
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useLogStore } from '../stores/logStore';
const logStore = useLogStore();

// 响应式状态
const logContainer = ref<HTMLElement | null>(null);
const autoScroll = ref(true);
const logLevel = ref<'all' | 'info' | 'error'>('all');
const alwaysOnTop = ref(false);

// 计算属性
const logMessages = computed(() => logStore.messages);

// 过滤后的日志消息
const filteredLogMessages = computed(() => {
  if (logLevel.value === 'all') {
    return logMessages.value;
  }
  
  return logMessages.value.filter((message: string) => {
    const lowerMessage = message.toLowerCase();
    if (logLevel.value === 'error') {
      return lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('错误') || lowerMessage.includes('失败');
    } else if (logLevel.value === 'info') {
      return !lowerMessage.includes('error') && !lowerMessage.includes('failed') && !lowerMessage.includes('错误') && !lowerMessage.includes('失败');
    }
    return true;
  });
});

// 方法
const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
  if (autoScroll.value) {
    scrollToBottom();
  }
};

const setLogLevel = (level: 'all' | 'info' | 'error') => {
  logLevel.value = level;
  nextTick(() => {
    if (autoScroll.value) {
      scrollToBottom();
    }
  });
};

const clearLogs = () => {
  logStore.clearLogs();
};

const exportLogs = async () => {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    
    const filePath = await save({
      filters: [{
        name: 'Text Files',
        extensions: ['txt', 'log']
      }],
      defaultPath: `sftool-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    });
    
    if (filePath) {
      const logContent = logMessages.value.join('\n');
      await writeTextFile(filePath, logContent);
      logStore.addMessage(`日志导出成功: ${filePath}`);
    }
  } catch (error) {
    logStore.addMessage(`日志导出失败: ${error}`, true);
  }
};

const toggleAlwaysOnTop = async () => {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const currentWindow = getCurrentWindow();
    alwaysOnTop.value = !alwaysOnTop.value;
    await currentWindow.setAlwaysOnTop(alwaysOnTop.value);
  } catch (error) {
    console.warn('设置窗口置顶失败:', error);
  }
};

const copyLogMessage = async (message: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(message);
      logStore.addMessage('消息已复制到剪贴板');
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = message;
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      logStore.addMessage('消息已复制到剪贴板');
    }
  } catch (error) {
    console.warn('复制到剪贴板失败:', error);
  }
};

const scrollToBottom = () => {
  if (logContainer.value) {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  }
};

const getLogMessageClass = (message: string) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('错误') || lowerMessage.includes('失败')) {
    return 'border-l-error text-error/90 bg-error/5';
  } else if (lowerMessage.includes('success') || lowerMessage.includes('completed') || lowerMessage.includes('成功') || lowerMessage.includes('完成')) {
    return 'border-l-success text-success/90 bg-success/5';
  } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn') || lowerMessage.includes('警告')) {
    return 'border-l-warning text-warning/90 bg-warning/5';
  }
  return 'border-l-info text-base-content bg-base-100/50';
};

const getLogLevelIndicator = (message: string) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('错误') || lowerMessage.includes('失败')) {
    return 'bg-error';
  } else if (lowerMessage.includes('success') || lowerMessage.includes('completed') || lowerMessage.includes('成功') || lowerMessage.includes('完成')) {
    return 'bg-success';
  } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn') || lowerMessage.includes('警告')) {
    return 'bg-warning';
  }
  return 'bg-info';
};

// 监听日志变化，自动滚动到底部
watch(
  () => logMessages.value.length,
  () => {
    if (autoScroll.value) {
      scrollToBottom();
    }
  },
  { flush: 'post' }
);

// 键盘快捷键
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const handleKeydown = (event: KeyboardEvent) => {
  // macOS 使用 Cmd，其他平台使用 Ctrl
  const modKey = isMac ? event.metaKey : event.ctrlKey;
  
  // Cmd/Ctrl+L 清除日志
  if (modKey && event.key === 'l') {
    event.preventDefault();
    if (!logStore.isFlashing) {
      clearLogs();
    }
  }
  
  // Cmd/Ctrl+S 导出日志
  if (modKey && event.key === 's') {
    event.preventDefault();
    exportLogs();
  }
  
  // Cmd/Ctrl+T 切换置顶
  if (modKey && event.key === 't') {
    event.preventDefault();
    toggleAlwaysOnTop();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  
  // 设置跨窗口事件监听器
  logStore.setupEventListeners();

  // 主动请求同步现有日志，避免新窗口出现空日志的情况
  import('@tauri-apps/api/event').then(({ emit }) => {
    emit('log-sync-request', {});
  }).catch((error) => {
    console.warn('请求日志同步失败:', error);
  });
  
  // 初始滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* 滚动容器样式 */
.scrollable-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.scrollable-container::-webkit-scrollbar {
  width: 8px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.scrollable-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 日志消息的边框样式 */
.border-l-error {
  border-left-color: oklch(var(--er));
}

.border-l-success {
  border-left-color: oklch(var(--su));
}

.border-l-warning {
  border-left-color: oklch(var(--wa));
}

.border-l-info {
  border-left-color: oklch(var(--in));
}
</style>
