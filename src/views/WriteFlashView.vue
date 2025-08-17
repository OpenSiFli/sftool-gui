<template>
  <div 
    class="p-4 h-screen flex flex-col overflow-hidden relative" 
    :class="{ 'bg-primary/5 transition-colors duration-200': isWindowDragging }"
  >
    <!-- 拖拽提示覆盖层 -->
    <div 
      v-if="isWindowDragging" 
      class="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none"
    >
      <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border-2 border-dashed border-primary">
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h2 class="text-2xl font-bold text-primary mb-2">{{ $t('writeFlash.dropFilesHere') }}</h2>
          <p class="text-gray-600 dark:text-gray-300">{{ $t('writeFlash.supportedFormats') }}</p>
        </div>
      </div>
    </div>
    
    <!-- 页面标题栏 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-base-content">{{ $t('writeFlash.title') }}</h1>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="flex flex-col space-y-4 flex-1 min-h-0">
      <!-- 文件选择区域 -->
      <div class="bg-base-100 rounded-lg shadow-sm border border-base-300 flex-1 min-h-0 overflow-hidden">
        <div class="p-4 h-full overflow-y-auto flex flex-col scrollable-container">
          <!-- 文件选择区域 -->
          <div class="form-control w-full flex-1 min-h-0 flex flex-col">
            <label class="label">
              <span class="label-text font-semibold">{{ $t('writeFlash.selectFiles') }}</span>
              <!-- 批量选择按钮 -->
              <button 
                class="btn btn-outline btn-xs gap-1"
                @click="handleSelectMultipleFiles"
                :disabled="isFlashing"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {{ $t('writeFlash.addMultipleFiles') }}
              </button>
            </label>
             
            <!-- 文件选择列表 -->
            <div class="mb-4 flex-1 min-h-0 overflow-y-auto scrollable-container">
              <!-- 已选择的文件 -->
              <transition-group 
                name="file-list" 
                tag="div" 
                class="space-y-2 mb-3 file-list-container"
              >
                <div 
                  v-for="(file, index) in selectedFiles" 
                  :key="file.id"
                  class="card card-compact shadow-sm file-list-item border transition-all duration-300"
                  :class="getFileCardClass(file)"
                >
                  <div class="card-body p-4">
                    <div class="flex flex-col gap-3">
                      <!-- 第一行：文件名和移除按钮 -->
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-sm truncate flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {{ file.name }}
                          </div>
                          <div class="text-xs text-base-content/60 mt-1" v-if="file.size && file.size > 0">
                            {{ formatFileSize(file.size) }}
                          </div>
                        </div>
                        <button 
                          class="btn btn-xs btn-error btn-outline hover:btn-error flex-shrink-0"
                          @click="removeFile(index)"
                          :disabled="isFlashing"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          移除
                        </button>
                      </div>
                      
                      <!-- 第二行：文件路径 -->
                      <div class="text-xs text-base-content/70 font-mono bg-base-200/20 border border-base-300/30 rounded px-2 py-1 truncate">
                        {{ file.path }}
                      </div>
                      
                      <!-- 第三行：地址设置 -->
                      <div class="flex gap-2 items-center" v-if="!isAutoAddressFile(file.name)">
                        <span class="text-xs text-base-content/60 flex-shrink-0">烧录地址:</span>
                        <div class="flex-1">
                          <input 
                            type="text" 
                            v-model="file.address"
                            class="input input-xs w-full text-xs font-mono bg-base-100/50 border-base-300/40 focus:border-primary/50 focus:bg-base-100/70 transition-all duration-200"
                            :class="{ 'border-error/50 bg-error/5': file.addressError }"
                            :placeholder="$t('writeFlash.addressPlaceholder')"
                            @input="validateAddress(index)"
                          />
                        </div>
                      </div>
                      <div v-else class="flex items-center justify-center">
                        <div class="badge badge-success badge-sm gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                          {{ $t('writeFlash.autoAddress') }}
                        </div>
                      </div>
                      
                      <!-- 地址错误信息 -->
                      <div v-if="file.addressError && !isAutoAddressFile(file.name)" class="text-xs text-error flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ file.addressError }}
                      </div>
                    </div>
                  </div>
                </div>
              </transition-group>
            </div>
            
            <!-- 空白选择框 -->
            <div 
              class="card card-compact bg-base-100 border-2 border-dashed border-base-300 hover:border-primary cursor-pointer transition-all duration-200 flex-shrink-0 hover:shadow-sm"
              @click="handleSelectFile"
              :class="{ 
                'opacity-50 cursor-not-allowed': isFlashing,
                'border-primary bg-primary/5': isWindowDragging
              }"
            >
              <div class="card-body p-6">
                <div class="flex flex-col items-center justify-center gap-3 text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <div class="text-center">
                    <div class="font-medium">{{ $t('writeFlash.clickToSelectFile') }}</div>
                    <div class="text-xs mt-1">{{ $t('writeFlash.supportedFormats') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮区域 -->
      <div class="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl shadow-sm border border-primary/20 flex-shrink-0">
        <div class="p-6 flex items-center justify-center">
          <!-- 下载按钮 -->
          <button 
            class="btn btn-primary btn-lg gap-3 px-8" 
            :disabled="!canStartFlashing || isFlashing" 
            @click="startFlashing"
          >
            <span v-if="isFlashing" class="loading loading-spinner loading-md"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="text-base font-medium">
              {{ isFlashing ? '烧录中...' : $t('writeFlash.startFlash') }}
            </span>
          </button>
        </div>
        
        <!-- 进度显示区域 -->
        <div class="mt-4 p-4 bg-base-100 rounded-lg border border-base-300">
          <div v-if="activeProgressItems.length > 0" class="space-y-3">
            <div v-for="[id, progress] in activeProgressItems" :key="id" 
                 class="p-3 bg-base-200 rounded-lg transition-all duration-300">
              
              <!-- 文件名和进度百分比 -->
              <div class="flex justify-between items-center mb-2">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate text-base-content">
                    {{ progress.fileName }}
                  </div>
                </div>
                <div class="ml-4 text-sm font-bold text-base-content">
                  {{ Math.round(progress.percentage) }}%
                </div>
              </div>
              
              <!-- 进度条 -->
              <div class="w-full bg-base-300 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                  class="h-2 rounded-full transition-all duration-300 ease-out bg-primary"
                  :style="{ width: `${progress.percentage}%` }"
                ></div>
              </div>
              
              <!-- 详细信息：大小、速度、剩余时间 -->
              <div class="flex justify-between items-center text-xs text-base-content/70">
                <span>
                  {{ formatBytes(progress.current) }} / {{ formatBytes(progress.total) }}
                </span>
                <div class="flex items-center gap-4">
                  <span v-if="progress.speed && progress.speed > 0" class="text-primary font-medium">
                    {{ formatSpeed(progress.speed) }}
                  </span>
                  <span v-if="progress.eta && progress.eta > 0 && progress.percentage < 100" class="text-warning font-medium">
                    {{ formatETA(progress.eta) }}
                  </span>
                  <span v-if="progress.percentage >= 100" class="text-success font-medium">
                    ✓ 完成
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 空状态占位 -->
          <div v-else class="p-3 bg-base-200 rounded-lg">
            <div class="flex justify-between items-center mb-2">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-base-content/50">
                  等待下载任务...
                </div>
              </div>
              <div class="ml-4 text-sm font-bold text-base-content/50">
                0%
              </div>
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
import { TauriEvent } from '@tauri-apps/api/event';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { listen } from '@tauri-apps/api/event';
import { useLogStore } from '../stores/logStore';

const { t } = useI18n();
const logStore = useLogStore();

// 文件类型定义
interface FlashFile {
  id: string;
  name: string;
  path: string;
  address?: string;
  addressError?: string;
  size?: number;
}

// 状态管理
const selectedFiles = ref<FlashFile[]>([]);
const isFlashing = ref(false);
const isWindowDragging = ref(false);

// 进度状态管理
const progressMap = ref<Map<number, {
  step: string;
  message: string;
  current?: number;
  total?: number;
  startTime?: number;
  lastUpdateTime?: number;
  speed?: number;
  eta?: number;
  percentage: number;
  fileName: string;
  address: number;
  status: 'waiting' | 'active' | 'completed' | 'error';
}>>(new Map());

// 生成唯一ID的函数
const generateFileId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

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

// 获取文件卡片样式
const getFileCardClass = (file: FlashFile) => {
  // 查找该文件的进度状态
  const progress = Array.from(progressMap.value.values()).find(p => 
    p.step === file.path || p.fileName === file.name
  );
  
  if (progress) {
    switch (progress.status) {
      case 'active':
        return 'bg-gradient-to-r from-blue-50/15 to-blue-50/25 border-blue-200/40 ring-1 ring-blue-200/20 hover:shadow-lg transition-all duration-300';
      case 'completed':
        return 'bg-gradient-to-r from-green-50/15 to-green-50/25 border-green-200/40 ring-1 ring-green-200/20 hover:shadow-lg transition-all duration-300';
      case 'error':
        return 'bg-gradient-to-r from-red-50/15 to-red-50/25 border-red-200/40 ring-1 ring-red-200/20 hover:shadow-lg transition-all duration-300';
      default:
        return 'bg-base-200/30 border-base-300/40 hover:shadow-md transition-all duration-300';
    }
  }
  
  return 'bg-base-200/30 border-base-300/40 hover:shadow-md transition-all duration-300';
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number | undefined): string => {
  if (!bytesPerSecond) return '-- KB/s';
  return formatFileSize(bytesPerSecond) + '/s';
};

// 格式化时间
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}时${minutes}分`;
  }
};

// 计算活跃的进度项
const activeProgressItems = computed(() => {
  return Array.from(progressMap.value.entries()).filter(([_, progress]) => 
    progress.current !== undefined && progress.total !== undefined && progress.current < progress.total
  );
});

// 处理进度事件
const handleProgressEvent = (event: any) => {
  const { id, event_type, step, message, current, total } = event;
  const now = Date.now();
  
  // 尝试从选中的文件列表中找到对应的文件名
  const getDisplayFileName = (step: string, id: number) => {
    // 如果有选中的文件，尝试根据索引匹配
    if (selectedFiles.value.length > 0) {
      const fileIndex = (id - 1) % selectedFiles.value.length;
      if (selectedFiles.value[fileIndex]) {
        return selectedFiles.value[fileIndex].name;
      }
    }
    // 回退到从step中提取文件名
    const extracted = extractFileName(step);
    // 如果提取的结果看起来像步骤号（如0x07），则使用消息中的信息或文件名
    if (/^0x[0-9a-fA-F]+$/.test(extracted) || /^\d+$/.test(extracted)) {
      // 如果有选中的文件，使用第一个文件的名称作为默认
      if (selectedFiles.value.length > 0) {
        return selectedFiles.value[0].name;
      }
      return `固件文件 (${extracted})`;
    }
    return extracted;
  };
  
  switch (event_type) {
    case 'start':
      progressMap.value.set(id, { 
        step, 
        message, 
        current, 
        total,
        startTime: now,
        speed: 0,
        eta: 0,
        percentage: 0,
        fileName: getDisplayFileName(step, id),
        address: parseInt(step) || 0,
        status: 'active'
      });
      logStore.addMessage(`[${getDisplayFileName(step, id)}] ${message}`);
      break;
      
    case 'update':
      const existing = progressMap.value.get(id);
      if (existing) {
        existing.message = message;
        logStore.addMessage(`[${existing.fileName}] ${message}`);
      }
      break;
      
    case 'increment':
      const progressItem = progressMap.value.get(id);
      if (progressItem && progressItem.current !== undefined) {
        progressItem.current += current || 0;
        
        // 计算百分比
        if (progressItem.total && progressItem.total > 0) {
          progressItem.percentage = Math.round((progressItem.current / progressItem.total) * 100);
        }
        
        // 计算速度和ETA
        if (progressItem.startTime && progressItem.current > 0) {
          const elapsed = (now - progressItem.startTime) / 1000; // 秒
          progressItem.speed = progressItem.current / elapsed; // bytes/s
          
          if (progressItem.total && progressItem.speed > 0) {
            const remaining = progressItem.total - progressItem.current;
            progressItem.eta = remaining / progressItem.speed; // 剩余秒数
          }
        }
        
        // 更新状态
        if (progressItem.percentage >= 100) {
          progressItem.status = 'completed';
        }
        
        if (progressItem.total) {
          const percentage = progressItem.percentage;
          const speedStr = progressItem.speed ? ` @ ${formatSpeed(progressItem.speed)}` : '';
          const etaStr = progressItem.eta && progressItem.eta > 0 ? ` (剩余 ${formatTime(progressItem.eta)})` : '';
          logStore.addMessage(`[${progressItem.fileName}] 进度: ${percentage}% (${formatBytes(progressItem.current)}/${formatBytes(progressItem.total)})${speedStr}${etaStr}`);
        }
      }
      break;
      
    case 'finish':
      const finishedItem = progressMap.value.get(id);
      if (finishedItem) {
        finishedItem.status = 'completed';
        finishedItem.percentage = 100;
        logStore.addMessage(`[${finishedItem.fileName}] ${message}`, true);
        // 暂时不删掉之前的进度
        // setTimeout(() => {
        //   progressMap.value.delete(id);
        // }, 2000);
      }
      break;
  }
};

// 初始化日志
const initializeLog = () => {
  logStore.initializeLog();
};

// 组件挂载时初始化
onMounted(async () => {
  // 设置跨窗口事件监听器
  logStore.setupEventListeners();
  
  initializeLog();
  
  try {
    // 监听进度事件
    const unlistenProgress = await listen('flash-progress', (event) => {
      handleProgressEvent(event.payload);
    });

    // 监听拖拽进入事件
    const unlistenDragEnter = await listen(TauriEvent.DRAG_ENTER, () => {
      console.log('Tauri file drag enter');
      logStore.addMessage('检测到文件拖拽进入窗口');
      if (!isFlashing.value) {
        isWindowDragging.value = true;
      }
    });

    // 监听拖拽离开事件
    const unlistenDragLeave = await listen(TauriEvent.DRAG_LEAVE, () => {
      console.log('Tauri file drag leave');
      logStore.addMessage('文件拖拽离开窗口');
      isWindowDragging.value = false;
    });

    // 监听拖拽悬停事件
    const unlistenDragOver = await listen(TauriEvent.DRAG_OVER, () => {
      console.log('Tauri file drag over');
      if (!isFlashing.value && !isWindowDragging.value) {
        isWindowDragging.value = true;
      }
    });

    // 监听文件拖拽释放事件
    const unlistenDragDrop = await listen(TauriEvent.DRAG_DROP, (event) => {
      console.log('Tauri file drop event:', event);
      logStore.addMessage('检测到文件拖拽释放');
      handleTauriFileDrop(event.payload);
      isWindowDragging.value = false;
    });
    
    // 存储清理函数
    (window as any).__tauriUnlisteners = {
      unlistenProgress,
      unlistenDragEnter,
      unlistenDragLeave,
      unlistenDragOver,
      unlistenDragDrop
    };

  } catch (error) {
    console.warn('无法设置Tauri文件拖拽监听器:', error);
    logStore.addMessage(`警告: 无法设置Tauri文件拖拽监听器，请使用文件选择按钮`, true);
  }
});

// 组件卸载时清理监听器
onUnmounted(() => {
  const unlisteners = (window as any).__tauriUnlisteners;
  if (unlisteners) {
    unlisteners.unlistenProgress?.();
    unlisteners.unlistenDragEnter?.();
    unlisteners.unlistenDragLeave?.();
    unlisteners.unlistenDragOver?.();
    unlisteners.unlistenDragDrop?.();
    delete (window as any).__tauriUnlisteners;
  }
});

// 统一添加文件并去重的函数
const addFilesWithDeduplication = (newFiles: FlashFile[], source: string) => {
  const addedFiles: FlashFile[] = [];
  const duplicatedFiles: string[] = [];
  
  for (const newFile of newFiles) {
    const existingFile = selectedFiles.value.find(file => file.path === newFile.path);
    if (existingFile) {
      duplicatedFiles.push(newFile.name);
      continue;
    }
    
    addedFiles.push(newFile);
  }
  
  // 添加新文件
  if (addedFiles.length > 0) {
    logStore.addMessage(`${t('writeFlash.status.fileSelected')}: ${source}添加了 ${addedFiles.length} 个文件`);
    
    addedFiles.forEach((file, index) => {
      setTimeout(() => {
        selectedFiles.value.push(file);
        
        if (file.size && file.size > 0) {
          logStore.addMessage(`- ${file.name} (${formatFileSize(file.size)})`);
        } else {
          logStore.addMessage(`- ${file.name}`);
        }
      }, index * 100);
    });
  }
  
  // 提示重复文件
  if (duplicatedFiles.length > 0) {
    logStore.addMessage(`跳过重复文件 (${duplicatedFiles.length}个): ${duplicatedFiles.join(', ')}`);
  }
  
  if (addedFiles.length === 0 && duplicatedFiles.length === 0) {
    logStore.addMessage('没有有效的固件文件被添加');
  }
};

// Tauri 文件拖拽处理
const handleTauriFileDrop = async (payload: any) => {
  if (isFlashing.value) {
    logStore.addMessage('烧录进行中，无法添加文件');
    return;
  }

  const paths: string[] = payload?.paths || [];
  
  logStore.addMessage(`解析结果: 检测到 ${paths.length} 个文件路径`);
  
  if (paths.length === 0) {
    logStore.addMessage('错误: 无法从拖拽事件中解析出文件路径', true);
    logStore.addMessage(`实际payload内容: ${JSON.stringify(payload)}`);
    return;
  }

  const droppedFiles: FlashFile[] = [];

  for (const path of paths) {
    if (typeof path !== 'string') {
      logStore.addMessage(`跳过无效路径: ${JSON.stringify(path)}`);
      continue;
    }
    
    const fileName = path.split(/[\/\\]/).pop() || path;
    logStore.addMessage(`处理文件: ${fileName} (路径: ${path})`);

    if (!isSupportedFile(fileName)) {
      logStore.addMessage(`${t('writeFlash.status.failed')}: ${t('writeFlash.status.unsupportedFileFormat')} - ${fileName}`, true);
      continue;
    }

    let defaultAddress = '';
    if (!isAutoAddressFile(fileName)) {
      defaultAddress = '0x10000000';
    }

    droppedFiles.push({
      id: generateFileId(),
      name: fileName,
      path: path,
      address: defaultAddress,
      addressError: '',
      size: 0 
    });
  }

  addFilesWithDeduplication(droppedFiles, '拖拽');
};

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = ['.bin', '.hex', '.elf', '.axf'];

const isSupportedFile = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(extension);
};

// 自动地址文件类型
const AUTO_ADDRESS_EXTENSIONS = ['.elf', '.axf', '.hex'];

const isAutoAddressFile = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return AUTO_ADDRESS_EXTENSIONS.includes(extension);
};

// 验证地址格式
const validateAddress = (index: number) => {
  const file = selectedFiles.value[index];
  if (!file.address) {
    file.addressError = t('writeFlash.validation.addressRequired');
    return false;
  }
  
  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(file.address)) {
    file.addressError = t('writeFlash.validation.invalidAddress');
    return false;
  }
  
  const addressValue = parseInt(file.address, 16);
  if (addressValue > 0xFFFFFFFF) {
    file.addressError = t('writeFlash.validation.addressTooLarge');
    return false;
  }
  
  const duplicateIndex = selectedFiles.value.findIndex((f, i) => 
    i !== index && f.address === file.address && f.address
  );
  if (duplicateIndex !== -1) {
    file.addressError = t('writeFlash.validation.duplicateAddress');
    return false;
  }
  
  file.addressError = '';
  return true;
};

// 验证所有文件
const validateAllFiles = (): boolean => {
  if (selectedFiles.value.length === 0) {
    logStore.addMessage(t('writeFlash.validation.noFiles'));
    return false;
  }
  
  let isValid = true;
  selectedFiles.value.forEach((file, index) => {
    if (!isAutoAddressFile(file.name)) {
      if (!validateAddress(index)) {
        isValid = false;
      }
    }
  });
  
  return isValid;
};

// 是否可以开始烧录
const canStartFlashing = computed(() => {
  if (selectedFiles.value.length === 0) return false;
  
  return selectedFiles.value.every((file) => {
    if (isAutoAddressFile(file.name)) return true;
    return file.address && !file.addressError;
  });
});

// 工具方法
const extractFileName = (filePath: string): string => {
  return filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
};

const formatETA = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${seconds.toFixed(2)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds.toFixed(2)}秒`;
};

// 文件选择API
const selectFile = async (multiple: boolean = false): Promise<FlashFile[]> => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile, exists } = await import('@tauri-apps/plugin-fs');
    
    const selected = await open({
      multiple,
      filters: [{
        name: 'Firmware Files',
        extensions: ['bin', 'hex', 'elf', 'axf']
      }]
    });
    
    if (!selected) return [];
    
    const files: FlashFile[] = [];
    const paths = Array.isArray(selected) ? selected : [selected];
    
    for (const filePath of paths) {
      try {
        const fileExists = await exists(filePath);
        if (!fileExists) {
          logStore.addMessage(`${t('writeFlash.status.failed')}: 文件不存在 - ${filePath}`);
          continue;
        }
        
        const fileContent = await readFile(filePath);
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
        
        files.push({
          id: generateFileId(),
          name: fileName,
          path: filePath,
          address: isAutoAddressFile(fileName) ? '' : '0x10000000',
          addressError: '',
          size: fileContent.length
        });
      } catch (error) {
        logStore.addMessage(`${t('writeFlash.status.failed')}: 读取文件失败 - ${filePath}: ${error}`);
      }
    }
    
    return files;
  } catch (error) {
    logStore.addMessage(`${t('writeFlash.status.failed')}: ${error}`);
    return [];
  }
};

// 选择单个文件
const handleSelectFile = async () => {
  if (isFlashing.value) return;
  
  try {
    const newFiles = await selectFile(false);
    if (newFiles.length > 0) {
      addFilesWithDeduplication(newFiles, '单文件选择');
    }
  } catch (error) {
    logStore.addMessage(`${t('writeFlash.status.failed')}: ${error}`);
  }
};

// 选择多个文件
const handleSelectMultipleFiles = async () => {
  if (isFlashing.value) return;
  
  try {
    const newFiles = await selectFile(true);
    if (newFiles.length > 0) {
      addFilesWithDeduplication(newFiles, '多文件选择');
    }
  } catch (error) {
    logStore.addMessage(`${t('writeFlash.status.failed')}: ${error}`);
  }
};

// 烧录过程
const flashProcess = async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    const writeFlashRequest = {
      files: selectedFiles.value.map(file => ({
        file_path: file.path,
        address: isAutoAddressFile(file.name) ? 0 : parseInt(file.address || '0x10000000', 16)
      })),
      verify: true,
      no_compress: false,
      erase_all: false
    };

    await invoke('write_flash', { request: writeFlashRequest });
    
  } catch (error) {
    throw new Error(`烧录失败: ${error}`);
  }
};

// 移除文件
const removeFile = (index: number) => {
  const file = selectedFiles.value[index];
  selectedFiles.value.splice(index, 1);
  logStore.addMessage(`${t('writeFlash.status.fileRemoved')}: ${file.name}`);
};

// 开始烧录
const startFlashing = async () => {
  if (!validateAllFiles()) return;
  
  isFlashing.value = true;
  logStore.setFlashing(true);
  progressMap.value.clear();
  
  logStore.addMessage(`${t('writeFlash.status.starting')}`);
  logStore.addMessage(`准备烧录 ${selectedFiles.value.length} 个文件...`);
  
  try {
    for (const file of selectedFiles.value) {
      logStore.addMessage(`${t('writeFlash.status.validating')}: ${file.name}`);
      
      const { invoke } = await import('@tauri-apps/api/core');
      const isValid = await invoke('validate_firmware_file', { filePath: file.path });
      if (!isValid) {
        throw new Error(`文件验证失败: ${file.name}`);
      }
    }
    
    logStore.addMessage('所有文件验证通过，开始烧录过程...');
    
    await flashProcess();
    logStore.addMessage(`${t('writeFlash.status.completed')}`, true);
  } catch (error) {
    logStore.addMessage(`${t('writeFlash.status.failed')}: ${error}`, true);
  } finally {
    isFlashing.value = false;
    logStore.setFlashing(false);
    progressMap.value.clear();
  }
};
</script>

<style>
/* 完全隐藏所有滚动条 */
/* Webkit浏览器滚动条 - 全局隐藏 */
::-webkit-scrollbar {
  width: 0px;
  height: 0px;
  background: transparent;
  display: none;
}

::-webkit-scrollbar-track {
  background: transparent;
  display: none;
}

::-webkit-scrollbar-thumb {
  background: transparent;
  display: none;
}

/* Firefox滚动条 - 全局隐藏 */
* {
  scrollbar-width: none;
  scrollbar-color: transparent transparent;
}

/* 滚动容器 - 完全隐藏滚动条，但保持滚动功能 */
.scrollable-container {
  position: relative;
  overflow: auto;
  scrollbar-width: none;
  scrollbar-color: transparent transparent;
}

.scrollable-container::-webkit-scrollbar {
  width: 0px;
  height: 0px;
  background: transparent;
  display: none;
}

.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
  display: none;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background: transparent;
  display: none;
}

/* 文件列表项的过渡动画 */
.file-list-item {
  transition: all 0.3s ease;
}

/* 列表项进入和离开的动画 */
.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.3s ease;
}

.file-list-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.file-list-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

/* 列表项移动的动画 */
.file-list-move {
  transition: transform 0.3s ease;
}

/* 确保leaving元素在正确位置，避免空白 */
.file-list-leave-active {
  position: absolute;
  width: calc(100% - 1.5rem); /* 减去容器的padding */
}

/* 为transition-group容器设置相对定位 */
.file-list-container {
  position: relative;
}

/* 日志容器样式 */
.log-container-wrapper {
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.log-container-wrapper > div {
  transition: opacity 0.3s ease;
}

/* 确保内容淡入淡出平滑 */
.log-container-wrapper div[v-if] {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>