<template>
  <div 
    v-if="isVisible"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    @click.self="closeWindow"
  >
    <!-- 日志窗口 -->
    <div 
      class="bg-base-100 rounded-xl shadow-2xl border border-base-300 w-full max-w-4xl h-[80vh] max-h-[600px] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- 窗口头部 -->
      <div class="flex items-center justify-between p-4 border-b border-base-300 bg-gradient-to-r from-primary/5 to-primary/10">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-success animate-pulse" v-if="isFlashing"></div>
          <div class="w-3 h-3 rounded-full bg-base-300" v-else></div>
          <h2 class="text-lg font-semibold text-base-content">
            {{ $t('writeFlash.log') }}
          </h2>
          <div class="badge badge-sm" :class="logMessages.length > 0 ? 'badge-primary' : 'badge-ghost'">
            {{ logMessages.length }}
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- 自动滚动切换 -->
          <div class="tooltip tooltip-bottom" :data-tip="$t('logWindow.autoScroll')">
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
                  {{ $t('logWindow.showAll') }}
                </a>
              </li>
              <li>
                <a @click="setLogLevel('info')" :class="{ 'active': logLevel === 'info' }">
                  {{ $t('logWindow.infoOnly') }}
                </a>
              </li>
              <li>
                <a @click="setLogLevel('error')" :class="{ 'active': logLevel === 'error' }">
                  {{ $t('logWindow.errorsOnly') }}
                </a>
              </li>
            </ul>
          </div>
          
          <!-- 清除日志 -->
          <div class="tooltip tooltip-bottom" :data-tip="$t('writeFlash.clearLog')">
            <button 
              class="btn btn-sm btn-circle btn-ghost"
              @click="clearLogs"
              :disabled="isFlashing"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <!-- 导出日志 -->
          <div class="tooltip tooltip-bottom" :data-tip="$t('logWindow.exportLog')">
            <button 
              class="btn btn-sm btn-circle btn-ghost"
              @click="exportLogs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
          
          <!-- 关闭按钮 -->
          <button 
            class="btn btn-sm btn-circle btn-ghost hover:btn-error"
            @click="closeWindow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 日志内容区域 -->
      <div class="flex-1 overflow-hidden p-4">
        <div 
          ref="logContainer"
          class="h-full overflow-y-auto font-mono text-sm leading-relaxed scrollable-container bg-base-200 rounded-lg p-3"
        >
          <div v-if="filteredLogMessages.length === 0" class="text-center text-base-content/60 py-8">
            {{ $t('logWindow.noLogs') }}
          </div>
          <div v-else>
            <!-- 日志消息列表 -->
            <div 
              v-for="(message, index) in filteredLogMessages" 
              :key="index"
              class="mb-1 py-1 px-2 rounded hover:bg-base-300/50 transition-colors group"
              :class="getLogMessageClass(message)"
            >
              <div class="flex items-start gap-2">
                <!-- 日志级别指示器 -->
                <div 
                  class="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  :class="getLogLevelIndicator(message)"
                ></div>
                
                <!-- 日志内容 -->
                <pre class="flex-1 whitespace-pre-wrap break-words text-xs">{{ message }}</pre>
                
                <!-- 复制按钮（仅在悬停时显示） -->
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
      <div class="flex items-center justify-between px-4 py-2 border-t border-base-300 bg-base-50 text-xs text-base-content/60">
        <div class="flex items-center gap-4">
          <span>{{ $t('logWindow.totalMessages', { count: logMessages.length }) }}</span>
          <span v-if="logLevel !== 'all'">{{ $t('logWindow.filteredMessages', { count: filteredLogMessages.length }) }}</span>
        </div>
        
        <div class="flex items-center gap-2">
          <span v-if="isFlashing" class="text-success">{{ $t('logWindow.activeSession') }}</span>
          <span v-else>{{ $t('logWindow.ready') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLogStore } from '../stores/logStore';

const { t } = useI18n();
const logStore = useLogStore();

// Props
interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// 响应式状态
const logContainer = ref<HTMLElement | null>(null);
const autoScroll = ref(true);
const logLevel = ref<'all' | 'info' | 'error'>('all');

// 计算属性
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const logMessages = computed(() => logStore.messages);
const isFlashing = computed(() => logStore.isFlashing);

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
const closeWindow = () => {
  isVisible.value = false;
};

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
      logStore.addMessage(`${t('logWindow.exportSuccess')}: ${filePath}`);
    }
  } catch (error) {
    logStore.addMessage(`${t('logWindow.exportFailed')}: ${error}`, true);
  }
};

const copyLogMessage = async (message: string) => {
  try {
    // 使用浏览器的 Clipboard API 作为备选
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(message);
      logStore.addMessage(t('logWindow.messageCopied'));
    } else {
      // 备选方案：创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = message;
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      logStore.addMessage(t('logWindow.messageCopied'));
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
    return 'text-error';
  } else if (lowerMessage.includes('success') || lowerMessage.includes('completed') || lowerMessage.includes('成功') || lowerMessage.includes('完成')) {
    return 'text-success';
  } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn') || lowerMessage.includes('警告')) {
    return 'text-warning';
  }
  return 'text-base-content';
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
    if (autoScroll.value && isVisible.value) {
      scrollToBottom();
    }
  },
  { flush: 'post' }
);

// 当窗口变为可见时，滚动到底部
watch(isVisible, (visible) => {
  if (visible && autoScroll.value) {
    nextTick(() => {
      scrollToBottom();
    });
  }
});

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (!isVisible.value) return;
  
  // ESC 键关闭窗口
  if (event.key === 'Escape') {
    closeWindow();
  }
  
  // Ctrl+L 清除日志
  if (event.ctrlKey && event.key === 'l') {
    event.preventDefault();
    if (!isFlashing.value) {
      clearLogs();
    }
  }
  
  // Ctrl+S 导出日志
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    exportLogs();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* 确保日志窗口在最高层级 */
.z-\[100\] {
  z-index: 100;
}

/* 滚动容器样式 */
.scrollable-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.scrollable-container::-webkit-scrollbar {
  width: 6px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.scrollable-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 日志消息动画 */
.log-message-enter-active {
  transition: all 0.3s ease;
}

.log-message-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

/* 窗口进入/离开动画 */
.log-window-enter-active,
.log-window-leave-active {
  transition: all 0.3s ease;
}

.log-window-enter-from,
.log-window-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
