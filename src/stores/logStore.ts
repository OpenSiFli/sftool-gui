import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { setupProgressEventLogger } from '../utils/progressEventLogger';

export interface LogMessage {
  id: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  important?: boolean;
}

let eventListenerInitialized = false;

const isLogWindow = async (): Promise<boolean> => {
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    return getCurrentWebviewWindow().label === 'log-window';
  } catch (_error) {
    return false;
  }
};

export const useLogStore = defineStore('log', () => {
  // 状态
  const messages = ref<string[]>([]);
  const isFlashing = ref(false);
  const maxMessages = ref(1000); // 最大日志条数限制

  // 计算属性
  const latestMessage = computed(() => {
    return messages.value.length > 0 ? messages.value[messages.value.length - 1] : '';
  });

  const hasErrors = computed(() => {
    return messages.value.some(message => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes('error') ||
        lowerMessage.includes('failed') ||
        lowerMessage.includes('错误') ||
        lowerMessage.includes('失败')
      );
    });
  });

  // 方法
  const addMessage = (message: string, important: boolean = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    messages.value.push(formattedMessage);

    // 限制日志条数，避免内存过度使用
    if (messages.value.length > maxMessages.value) {
      messages.value = messages.value.slice(-maxMessages.value);
    }

    // 如果是重要消息，可以触发一些特殊处理
    if (important) {
      console.log('Important log message:', formattedMessage);
    }

    // 发送跨窗口事件
    emitLogEvent('log-message', { message: formattedMessage, important });
  };

  const clearLogs = () => {
    messages.value = [];
    const timestamp = new Date().toLocaleTimeString();
    const clearMessage = `[${timestamp}] 日志已清空`;
    messages.value.push(clearMessage);

    // 发送清空日志事件
    emitLogEvent('log-clear', {});
  };

  const setFlashing = (flashing: boolean) => {
    isFlashing.value = flashing;
    if (flashing) {
      addMessage('开始烧录会话');
    } else {
      addMessage('烧录会话结束');
    }

    // 发送烧录状态事件
    emitLogEvent('log-flashing', { isFlashing: flashing });
  };

  // 标记是否已初始化
  const initialized = ref(false);

  const initializeLog = () => {
    // 只在首次初始化时添加系统就绪消息，不清除已有日志
    if (!initialized.value) {
      addMessage('系统就绪');
      initialized.value = true;
    }
  };

  // 跨窗口事件处理
  const emitLogEvent = async (eventName: string, payload: any) => {
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit(eventName, payload);
    } catch (error) {
      console.warn('Failed to emit log event:', error);
    }
  };

  const setupEventListeners = async () => {
    if (eventListenerInitialized) return;

    try {
      const { listen } = await import('@tauri-apps/api/event');

      // 监听日志消息事件
      await listen('log-message', (event: any) => {
        const { message } = event.payload;
        if (message && !messages.value.includes(message)) {
          messages.value.push(message);
          // 限制日志条数
          if (messages.value.length > maxMessages.value) {
            messages.value = messages.value.slice(-maxMessages.value);
          }
        }
      });

      // 监听清空日志事件
      await listen('log-clear', () => {
        messages.value = [];
      });

      // 监听烧录状态事件
      await listen('log-flashing', (event: any) => {
        const { isFlashing: flashing } = event.payload;
        isFlashing.value = flashing;
      });

      // 监听日志同步请求，发送当前所有日志到新窗口
      await listen('log-sync-request', async () => {
        // 只有当前窗口有日志时才广播，避免空窗口覆盖有内容的窗口
        if (messages.value.length === 0) return;
        try {
          const { emit } = await import('@tauri-apps/api/event');
          await emit('log-sync-data', {
            messages: messages.value,
            isFlashing: isFlashing.value,
          });
        } catch (error) {
          console.warn('Failed to sync log data:', error);
        }
      });

      // 监听日志同步数据
      await listen('log-sync-data', (event: any) => {
        const { messages: syncedMessages, isFlashing: syncedFlashing } = event.payload;
        if (syncedMessages && Array.isArray(syncedMessages)) {
          // 如果传入的日志比当前的少且当前已有数据，忽略以防止被空日志覆盖
          if (messages.value.length > 0 && syncedMessages.length < messages.value.length) {
            return;
          }
          // 同步日志和状态
          messages.value = syncedMessages;
          isFlashing.value = syncedFlashing;
        }
      });

      await setupProgressEventLogger({
        addMessage,
        isEnabled: async () => !(await isLogWindow()),
      });

      eventListenerInitialized = true;
    } catch (error) {
      console.warn('Failed to setup log event listeners:', error);
    }
  };

  return {
    // 状态
    messages: messages,
    isFlashing: isFlashing,

    // 计算属性
    latestMessage,
    hasErrors,

    // 方法
    addMessage,
    clearLogs,
    setFlashing,
    initializeLog,
    setupEventListeners,
  };
});
