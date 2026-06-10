import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { setupProgressEventLogger } from '../utils/progressEventLogger';
import {
  createLogEntry,
  formatLogEntry,
  getLatestLogStatusText,
  isBlockingLogError,
  normalizeLogEntry,
} from '../utils/logEntries';
import { DEFAULT_LOG_MAX_ENTRIES } from '../utils/logSettings';
import { useUserStore } from './userStore';
import type { LogEntry, LogEntryInput } from '../types/log';

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
  const entries = ref<LogEntry[]>([]);
  const isFlashing = ref(false);
  const maxMessages = ref(DEFAULT_LOG_MAX_ENTRIES); // 最大日志条数限制

  // 计算属性
  const messages = computed(() => entries.value.map(formatLogEntry));

  const latestMessage = computed(() => {
    return messages.value.length > 0 ? messages.value[messages.value.length - 1] : '';
  });

  const latestStatusText = computed(() => getLatestLogStatusText(entries.value));

  const hasErrors = computed(() => {
    return entries.value.some(isBlockingLogError);
  });

  // 方法
  const addEntry = (entryInput: LogEntryInput, shouldEmit = true) => {
    const entry = createLogEntry(entryInput);
    if (entries.value.some(currentEntry => currentEntry.id === entry.id)) return entry;

    entries.value.push(entry);
    if (entries.value.length > maxMessages.value) {
      entries.value = entries.value.slice(-maxMessages.value);
    }

    if (entry.important) {
      console.log('Important log message:', formatLogEntry(entry));
    }

    if (shouldEmit) {
      emitLogEvent('app-log', entry);
      emitLogEvent('log-message', {
        id: entry.id,
        message: formatLogEntry(entry),
        important: entry.important,
      });
    }

    return entry;
  };

  const addMessage = (message: string, important: boolean = false) => {
    addEntry({
      source: 'frontend',
      message,
      important,
    });
  };

  const setMaxMessages = (value: number) => {
    maxMessages.value = value;
    if (entries.value.length > maxMessages.value) {
      entries.value = entries.value.slice(-maxMessages.value);
    }
  };

  const clearLogs = () => {
    entries.value = [];
    addEntry({
      level: 'info',
      source: 'system',
      message: '日志已清空',
    });

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

      await listen('app-log', (event: any) => {
        const entry = normalizeLogEntry(event.payload);
        addEntry(entry, false);
      });

      // 监听日志消息事件
      await listen('log-message', (event: any) => {
        const entry = normalizeLogEntry(event.payload);
        if (entry.message) {
          addEntry(entry, false);
        }
      });

      // 监听清空日志事件
      await listen('log-clear', () => {
        entries.value = [];
      });

      // 监听烧录状态事件
      await listen('log-flashing', (event: any) => {
        const { isFlashing: flashing } = event.payload;
        isFlashing.value = flashing;
      });

      // 监听日志同步请求，发送当前所有日志到新窗口
      await listen('log-sync-request', async () => {
        // 只有当前窗口有日志时才广播，避免空窗口覆盖有内容的窗口
        if (entries.value.length === 0) return;
        try {
          const { emit } = await import('@tauri-apps/api/event');
          await emit('log-sync-data', {
            entries: entries.value,
            messages: messages.value,
            isFlashing: isFlashing.value,
          });
        } catch (error) {
          console.warn('Failed to sync log data:', error);
        }
      });

      // 监听日志同步数据
      await listen('log-sync-data', (event: any) => {
        const { entries: syncedEntries, messages: syncedMessages, isFlashing: syncedFlashing } = event.payload;
        if (syncedEntries && Array.isArray(syncedEntries)) {
          if (entries.value.length > 0 && syncedEntries.length < entries.value.length) {
            return;
          }
          entries.value = syncedEntries.map(normalizeLogEntry);
          isFlashing.value = syncedFlashing;
        } else if (syncedMessages && Array.isArray(syncedMessages)) {
          // 如果传入的日志比当前的少且当前已有数据，忽略以防止被空日志覆盖
          if (entries.value.length > 0 && syncedMessages.length < entries.value.length) {
            return;
          }
          // 同步日志和状态
          entries.value = syncedMessages.map(message => normalizeLogEntry({ message }));
          isFlashing.value = syncedFlashing;
        }
      });

      await setupProgressEventLogger({
        addMessage,
        addEntry,
        isEnabled: async () => !(await isLogWindow()),
      });

      setMaxMessages(useUserStore().logMaxEntries);

      eventListenerInitialized = true;
    } catch (error) {
      console.warn('Failed to setup log event listeners:', error);
    }
  };

  return {
    // 状态
    entries,
    messages,
    isFlashing,
    maxMessages,

    // 计算属性
    latestMessage,
    latestStatusText,
    hasErrors,

    // 方法
    addEntry,
    addMessage,
    setMaxMessages,
    clearLogs,
    setFlashing,
    initializeLog,
    setupEventListeners,
  };
});
