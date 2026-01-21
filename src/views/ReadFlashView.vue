<template>
  <div class="p-4 h-screen flex flex-col overflow-hidden relative">
    <!-- 页面标题栏 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-base-content">{{ $t('readFlash.title') }}</h1>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex flex-col space-y-4 flex-1 min-h-0">
      <!-- 任务列表区域 -->
      <div class="bg-base-100 rounded-lg shadow-sm border border-base-300 flex-1 min-h-0 overflow-hidden">
        <div class="p-4 h-full overflow-y-auto flex flex-col scrollable-container">
          <!-- 任务列表标题 -->
          <div class="form-control w-full flex-1 min-h-0 flex flex-col">
            <label class="label">
              <span class="label-text font-semibold">{{ $t('readFlash.taskList') }}</span>
              <!-- 添加任务按钮 -->
            </label>

            <!-- 任务列表 -->
            <div class="mb-4 flex-1 min-h-0 overflow-y-auto scrollable-container">
              <!-- 已添加的任务 -->
              <transition-group name="task-list" tag="div" class="space-y-2 mb-3 task-list-container">
                <ReadTaskCard
                  v-for="(task, index) in readFlashStore.tasks"
                  :key="task.id"
                  :task="task"
                  :index="index"
                />
              </transition-group>
            </div>

            <!-- 空白添加框 -->
            <div
              class="card card-compact bg-base-100 border-2 border-dashed border-base-300 hover:border-primary cursor-pointer transition-all duration-200 flex-shrink-0 hover:shadow-sm"
              @click="handleAddTask"
              :class="{ 'opacity-50 cursor-not-allowed': readFlashStore.isReading }"
            >
              <div class="card-body p-4">
                <div class="flex flex-col items-center justify-center gap-2 text-base-content/60">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <div class="text-center">
                    <div class="font-medium text-sm">{{ $t('readFlash.clickToAddTask') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮区域 -->
      <div class="flex-shrink-0">
        <div class="flex items-center justify-center">
          <!-- 读取按钮 -->
          <button
            class="btn btn-primary btn-md gap-2 px-6"
            :disabled="!readFlashStore.canStartReading || readFlashStore.isReading"
            @click="startReading"
          >
            <span v-if="readFlashStore.isReading" class="loading loading-spinner loading-sm"></span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span class="text-sm font-medium">
              {{ readFlashStore.isReading ? $t('readFlash.status.progress') : $t('readFlash.startRead') }}
            </span>
          </button>
        </div>

        <!-- 进度显示区域 -->
        <div class="mt-3">
          <!-- 读取完成提示 -->
          <div
            v-if="readFlashStore.readCompleted && readFlashStore.completedTasks.size > 0"
            class="mb-3 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 border border-green-200/50 rounded-lg shadow-lg"
          >
            <div class="flex items-center justify-center gap-3 text-center">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-7 w-7 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3 class="text-lg font-bold text-green-800 mb-1">{{ $t('readFlash.status.completed') }}</h3>
                <p class="text-sm text-green-600">
                  {{ $t('readFlash.completedMessage', { count: readFlashStore.completedTasks.size }) }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="readFlashStore.totalProgress.totalCount > 0 || readFlashStore.isReading" class="space-y-3">
            <div class="p-3 bg-base-200/50 rounded-lg transition-all duration-300">
              <!-- 文件名和进度百分比 -->
              <div class="flex justify-between items-center mb-2">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate text-base-content">
                    <span v-if="readFlashStore.totalProgress.currentFileName">
                      <span v-if="readFlashStore.currentOperation" class="text-primary"
                        >{{ readFlashStore.currentOperation }}：</span
                      >{{ readFlashStore.totalProgress.currentFileName }}
                      <span v-if="readFlashStore.totalProgress.totalCount > 1" class="text-base-content/60 ml-2">
                        ({{ readFlashStore.totalProgress.completedCount + 1 }}/{{
                          readFlashStore.totalProgress.totalCount
                        }})
                      </span>
                    </span>
                    <span
                      v-else-if="readFlashStore.currentOperation && !readFlashStore.totalProgress.currentFileName"
                      class="text-primary"
                    >
                      {{ t('readFlash.operationInProgress', { operation: readFlashStore.currentOperation }) }}
                    </span>
                    <span v-else-if="readFlashStore.readCompleted" class="text-success">
                      {{ $t('readFlash.status.completed') }}
                    </span>
                    <span v-else>
                      {{ t('readFlash.preparing') }}
                    </span>
                  </div>
                </div>
                <div class="ml-4 text-sm font-bold text-base-content">
                  {{ Math.round(readFlashStore.totalProgress.percentage) }}%
                </div>
              </div>

              <!-- 进度条 -->
              <div class="w-full bg-base-300 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  class="h-2 rounded-full transition-all duration-300 ease-out"
                  :class="readFlashStore.readCompleted ? 'bg-success' : 'bg-primary'"
                  :style="{ width: `${readFlashStore.totalProgress.percentage}%` }"
                ></div>
              </div>

              <!-- 详细信息：大小、速度、剩余时间 -->
              <div class="flex justify-between items-center text-xs text-base-content/70">
                <span v-if="readFlashStore.totalProgress.total > 0">
                  {{ formatBytes(readFlashStore.totalProgress.current) }} /
                  {{ formatBytes(readFlashStore.totalProgress.total) }}
                </span>
                <span v-else>
                  {{ t('readFlash.waitingToStart') }}
                </span>
                <div class="flex items-center gap-4">
                  <span
                    v-if="readFlashStore.totalProgress.speed && readFlashStore.totalProgress.speed > 0"
                    class="text-primary font-medium"
                  >
                    {{ formatSpeed(readFlashStore.totalProgress.speed) }}
                  </span>
                  <span
                    v-if="
                      readFlashStore.totalProgress.eta &&
                      readFlashStore.totalProgress.eta > 0 &&
                      readFlashStore.totalProgress.percentage < 100
                    "
                    class="text-warning font-medium"
                  >
                    {{ formatETA(readFlashStore.totalProgress.eta) }}
                  </span>
                  <span v-if="readFlashStore.readCompleted" class="text-success font-medium">
                    ✓ {{ t('readFlash.allCompleted') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态占位 -->
          <div v-else class="p-3 bg-base-200/30 rounded-lg">
            <div class="flex justify-between items-center mb-2">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-base-content/50">
                  {{ t('readFlash.waitingForTasks') }}
                </div>
              </div>
              <div class="ml-4 text-sm font-bold text-base-content/50">0%</div>
            </div>

            <!-- 空进度条 -->
            <div class="w-full bg-base-300 rounded-full h-2 mb-2 overflow-hidden">
              <div class="h-2 rounded-full bg-base-300"></div>
            </div>

            <!-- 空详细信息 -->
            <div class="flex justify-between items-center text-xs text-base-content/50">
              <span>0 B / 0 B</span>
              <div class="flex items-center gap-4">
                <span>-- KB/s</span>
                <span>--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { listen } from '@tauri-apps/api/event';
import { useLogStore } from '../stores/logStore';
import { useReadFlashStore } from '../stores/readFlashStore';
import { MessageParser } from '../utils/messageParser';
import { OperationType, type ProgressEvent } from '../types/progress';
import ReadTaskCard from '../components/ReadTaskCard.vue';

const { t } = useI18n();
const logStore = useLogStore();
const readFlashStore = useReadFlashStore();

// 格式化文件大小
const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 格式化字节数（用于进度显示）
const formatBytes = (bytes: number | undefined): string => {
  return formatFileSize(bytes);
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number | undefined): string => {
  if (!bytesPerSecond) return '-- KB/s';
  return formatFileSize(bytesPerSecond) + '/s';
};

// 格式化剩余时间
const formatETA = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${seconds.toFixed(2)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds.toFixed(2)}秒`;
};

// 解析带SI单位的大小值 (支持 K, M, G, Ki, Mi, Gi)
const parseSizeWithUnit = (sizeStr: string): number | null => {
  if (!sizeStr) return null;

  const trimmed = sizeStr.trim().toUpperCase();

  // 支持十六进制
  if (trimmed.startsWith('0X')) {
    const value = parseInt(trimmed, 16);
    return isNaN(value) ? null : value;
  }

  // 匹配数字和可选的单位
  const match = trimmed.match(/^([\d.]+)\s*([KMGT]?)(I?B?)?$/i);
  if (!match) {
    // 尝试纯数字
    const value = parseFloat(trimmed);
    return isNaN(value) ? null : Math.floor(value);
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) return null;

  const unit = match[2].toUpperCase();
  const isBinary = match[3]?.toUpperCase().startsWith('I'); // Ki, Mi, Gi 使用 1024

  const base = isBinary ? 1024 : 1024; // 统一使用 1024 作为基数

  let multiplier = 1;
  switch (unit) {
    case 'K':
      multiplier = base;
      break;
    case 'M':
      multiplier = base * base;
      break;
    case 'G':
      multiplier = base * base * base;
      break;
    case 'T':
      multiplier = base * base * base * base;
      break;
    default:
      multiplier = 1;
  }

  return Math.floor(value * multiplier);
};

// 进度计算相关变量
let lastProgressUpdate = 0;
let lastProgressBytes = 0;
let currentProgressBytes = 0; // 累计的进度字节数
let totalProgressBytes = 0; // 总字节数

const formatAddress = (address: number): string => {
  return `0x${address.toString(16).toUpperCase().padStart(8, '0')}`;
};

// 初始化日志
const initializeLog = () => {
  logStore.initializeLog();
};

// 组件挂载时初始化
onMounted(async () => {
  logStore.setupEventListeners();

  // 确保初次进入页面时进度/完成状态被清理
  if (!readFlashStore.isReading) {
    readFlashStore.resetProgressStates();
  }

  initializeLog();

  // 从存储中加载任务列表
  await readFlashStore.loadTasksFromStorage();

  try {
    // 监听进度事件
    const unlistenProgress = await listen('flash-progress', event => {
      handleProgressEvent(event.payload);
    });

    // 存储清理函数
    (window as any).__readFlashUnlisteners = {
      unlistenProgress,
    };
  } catch (error) {
    console.warn('无法设置进度监听器:', error);
    logStore.addMessage('警告: 无法设置进度监听器', true);
  }
});

// 组件卸载时清理监听器
onUnmounted(() => {
  const unlisteners = (window as any).__readFlashUnlisteners;
  if (unlisteners) {
    unlisteners.unlistenProgress?.();
    delete (window as any).__readFlashUnlisteners;
  }
});

// 处理进度事件
const handleProgressEvent = (event: ProgressEvent) => {
  // 只在读取进行中时处理进度事件，避免捕获设备连接等其他操作的进度
  if (!readFlashStore.isReading) {
    return;
  }

  if (event.operation?.kind !== 'read_flash') {
    return;
  }

  const now = Date.now();
  const { address, size } = event.operation;

  if (event.event_type === 'start') {
    readFlashStore.setCurrentOperation(MessageParser.getOperationName(OperationType.READ));
    lastProgressUpdate = now;
    lastProgressBytes = 0;
    currentProgressBytes = event.current || 0;
    totalProgressBytes = event.total || size || 0;

    const task = readFlashStore.tasks.find(t => parseInt(t.address, 16) === address);
    const fileName = task ? task.filePath.split(/[/\\]/).pop() || task.filePath : formatAddress(address);

    if (task) {
      readFlashStore.setCurrentReadingTaskId(task.id);
      readFlashStore.setCurrentReadingFile(task.filePath);
    }

    readFlashStore.updateProgress({
      currentFileName: fileName,
      totalCount: readFlashStore.tasks.length,
      current: currentProgressBytes,
      total: totalProgressBytes,
      percentage: 0,
    });
  } else if (event.event_type === 'increment') {
    // increment 事件的 current 是增量 (delta)，不是绝对值
    const delta = event.current || 0;
    currentProgressBytes += delta;

    const percentage = totalProgressBytes > 0 ? (currentProgressBytes / totalProgressBytes) * 100 : 0;

    // 计算速度
    const timeDiff = (now - lastProgressUpdate) / 1000; // 转换为秒
    const bytesDiff = currentProgressBytes - lastProgressBytes;
    let speed = 0;

    if (timeDiff > 0.1) {
      // 至少100ms才计算速度，避免抖动
      speed = bytesDiff / timeDiff;
      lastProgressUpdate = now;
      lastProgressBytes = currentProgressBytes;
    } else if (readFlashStore.totalProgress.speed) {
      speed = readFlashStore.totalProgress.speed; // 保持上一次的速度
    }

    // 计算预计剩余时间
    const remaining = totalProgressBytes - currentProgressBytes;
    const eta = speed > 0 ? remaining / speed : 0;

    readFlashStore.updateProgress({
      current: currentProgressBytes,
      total: totalProgressBytes,
      percentage: percentage,
      speed: speed,
      eta: eta,
    });

    // 检测单个任务完成 (当前进度 >= 总进度)
    if (totalProgressBytes > 0 && currentProgressBytes >= totalProgressBytes) {
      if (readFlashStore.currentReadingTaskId) {
        readFlashStore.addCompletedTask(readFlashStore.currentReadingTaskId);
      }
    }
  } else if (event.event_type === 'update') {
    // update 事件可能包含绝对值
    if (event.current !== undefined && event.total !== undefined) {
      currentProgressBytes = event.current;
      totalProgressBytes = event.total;
      const percentage = totalProgressBytes > 0 ? (currentProgressBytes / totalProgressBytes) * 100 : 0;

      readFlashStore.updateProgress({
        current: currentProgressBytes,
        total: totalProgressBytes,
        percentage: percentage,
      });

      // 检测单个任务完成
      if (totalProgressBytes > 0 && currentProgressBytes >= totalProgressBytes) {
        if (readFlashStore.currentReadingTaskId) {
          readFlashStore.addCompletedTask(readFlashStore.currentReadingTaskId);
        }
      }
    }
  } else if (event.event_type === 'finish') {
    // 单个文件读取完成
    if (readFlashStore.currentReadingTaskId) {
      readFlashStore.addCompletedTask(readFlashStore.currentReadingTaskId);
    }

    // 这里的 finish 只是单个 invoke 调用的结束
    // 整个任务队列的结束由 startReading 函数控制
    readFlashStore.updateProgress({
      speed: 0,
      eta: 0,
    });

    // 重置进度跟踪变量
    currentProgressBytes = 0;
    totalProgressBytes = 0;
    lastProgressBytes = 0;
  }
};

// 验证所有任务
const validateAllTasks = (): boolean => {
  if (readFlashStore.tasks.length === 0) {
    logStore.addMessage(t('readFlash.validation.noTasks'));
    return false;
  }

  // 组件层级已进行验证，此处仅检查store状态
  return readFlashStore.canStartReading;
};

// 添加任务
const handleAddTask = () => {
  if (readFlashStore.isReading) return;
  readFlashStore.addTask();
  logStore.addMessage(t('readFlash.log.taskAdded'));
};

// 开始读取
const startReading = async () => {
  if (!validateAllTasks()) return;

  readFlashStore.setReadingState(true);
  readFlashStore.resetProgressStates();

  logStore.addMessage(t('readFlash.log.startReading'));

  try {
    const { invoke } = await import('@tauri-apps/api/core');

    // 顺序执行任务，避免后端并发处理问题
    const tasks = readFlashStore.tasks;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // 更新总体进度信息（文件计数）
      readFlashStore.updateProgress({
        completedCount: i,
        totalCount: tasks.length,
      });

      // 构造单文件请求
      const sizeValue = parseSizeWithUnit(task.size) || 0;
      const readFlashRequest = {
        files: [
          {
            file_path: task.filePath,
            address: parseInt(task.address, 16),
            size: sizeValue,
          },
        ],
      };

      logStore.addMessage(`${t('readFlash.log.processingFile', { name: task.filePath, path: task.address })}`);

      // 调用后端
      await invoke('read_flash', { request: readFlashRequest });
    }

    // 所有任务完成
    readFlashStore.setReadCompleted(true);
    readFlashStore.updateProgress({
      percentage: 100,
      completedCount: tasks.length,
      totalCount: tasks.length,
    });
    logStore.addMessage(t('readFlash.status.completed'));
  } catch (error) {
    logStore.addMessage(`${t('readFlash.status.failed')}: ${error}`, true);
  } finally {
    readFlashStore.setReadingState(false);
  }
};
</script>

<style scoped>
/* 任务列表动画 */
.task-list-enter-active,
.task-list-leave-active {
  transition: all 0.3s ease;
}

.task-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.task-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 正在下载的文件样式 */
.downloading-file {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%,
  100% {
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
  }
  50% {
    border-color: rgba(59, 130, 246, 0.8);
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.4);
  }
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
</style>
