import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface LogMessage {
  id: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  important?: boolean;
}

let eventListenerInitialized = false;

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
      return lowerMessage.includes('error') || lowerMessage.includes('failed') || 
             lowerMessage.includes('错误') || lowerMessage.includes('失败');
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

  const initializeLog = () => {
    messages.value = [];
    addMessage('系统就绪');
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
    setupEventListeners
  };
});
