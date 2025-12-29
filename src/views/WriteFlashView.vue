<template>
  <div 
    class="p-4 h-screen flex flex-col overflow-hidden relative" 
    :class="{ 'bg-primary/5 transition-colors duration-200': writeFlashStore.isWindowDragging }"
  >
    <!-- 拖拽提示覆盖层 -->
    <div 
      v-if="writeFlashStore.isWindowDragging" 
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
                :disabled="writeFlashStore.isFlashing"
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
                <FlashFileCard 
                  v-for="(file, index) in writeFlashStore.selectedFiles" 
                  :key="file.id"
                  :file="file"
                  :index="index"
                />
              </transition-group>
            </div>
            
            <!-- 空白选择框 -->
            <div 
              class="card card-compact bg-base-100 border-2 border-dashed border-base-300 hover:border-primary cursor-pointer transition-all duration-200 flex-shrink-0 hover:shadow-sm"
              @click="handleSelectFile"
              :class="{ 
                'opacity-50 cursor-not-allowed': writeFlashStore.isFlashing,
                'border-primary bg-primary/5': writeFlashStore.isWindowDragging
              }"
            >
              <div class="card-body p-4">
                <div class="flex flex-col items-center justify-center gap-2 text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <div class="text-center">
                    <div class="font-medium text-sm">{{ $t('writeFlash.clickToSelectFile') }}</div>
                    <div class="text-xs mt-1">{{ $t('writeFlash.supportedFormats') }}</div>
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
          <!-- 下载按钮 -->
            <button 
            class="btn btn-primary btn-md gap-2 px-6" 
            :disabled="!writeFlashStore.canStartFlashing || writeFlashStore.isFlashing" 
            @click="startFlashing"
          >
            <span v-if="writeFlashStore.isFlashing" class="loading loading-spinner loading-sm"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="text-sm font-medium">
              {{ writeFlashStore.isFlashing ? $t('writeFlash.status.progress') : $t('writeFlash.startFlash') }}
            </span>
          </button>
        </div>
        
        <!-- 进度显示区域 -->
        <div class="mt-3">
          <!-- 烧录完成提示 -->
          <div v-if="writeFlashStore.flashCompleted && writeFlashStore.completedFiles.size > 0" class="mb-3 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 border border-green-200/50 rounded-lg shadow-lg">
            <div class="flex items-center justify-center gap-3 text-center">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 class="text-lg font-bold text-green-800 mb-1">{{ $t('writeFlash.status.completed') }}</h3>
                <p class="text-sm text-green-600">
                  {{ $t('writeFlash.completedMessage', { count: writeFlashStore.completedFiles.size }) }}
                </p>
              </div>
            </div>
          </div>
          
          <div v-if="writeFlashStore.totalProgress.totalCount > 0 || writeFlashStore.isFlashing" class="space-y-3">
            <div class="p-3 bg-base-200/50 rounded-lg transition-all duration-300">
              
              <!-- 文件名和进度百分比 -->
              <div class="flex justify-between items-center mb-2">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate text-base-content">
                    <span v-if="writeFlashStore.totalProgress.currentFileName">
                      <span v-if="writeFlashStore.currentOperation" class="text-primary">{{ writeFlashStore.currentOperation }}：</span>{{ writeFlashStore.totalProgress.currentFileName }}
                      <span v-if="writeFlashStore.totalProgress.totalCount > 1" class="text-base-content/60 ml-2">
                        ({{ writeFlashStore.totalProgress.completedCount + 1 }}/{{ writeFlashStore.totalProgress.totalCount }})
                      </span>
                    </span>
                    <span v-else-if="writeFlashStore.currentOperation && !writeFlashStore.totalProgress.currentFileName" class="text-primary">
                      {{ t('writeFlash.operationInProgress', { operation: writeFlashStore.currentOperation }) }}
                    </span>
                    <span v-else-if="writeFlashStore.flashCompleted" class="text-success">
                      烧录完成！
                    </span>
                    <span v-else>
                      {{ t('writeFlash.preparing') }}
                    </span>
                  </div>
                </div>
                <div class="ml-4 text-sm font-bold text-base-content">
                  {{ Math.round(writeFlashStore.totalProgress.percentage) }}%
                </div>
              </div>
              
              <!-- 进度条 -->
              <div class="w-full bg-base-300 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                  class="h-2 rounded-full transition-all duration-300 ease-out"
                  :class="writeFlashStore.flashCompleted ? 'bg-success' : 'bg-primary'"
                  :style="{ width: `${writeFlashStore.totalProgress.percentage}%` }"
                ></div>
              </div>
              
              <!-- 详细信息：大小、速度、剩余时间 -->
              <div class="flex justify-between items-center text-xs text-base-content/70">
                <span v-if="writeFlashStore.totalProgress.total > 0">
                  {{ formatBytes(writeFlashStore.totalProgress.current) }} / {{ formatBytes(writeFlashStore.totalProgress.total) }}
                </span>
                <span v-else>
                  {{ t('writeFlash.waitingToStart') }}
                </span>
                <div class="flex items-center gap-4">
                  <span v-if="writeFlashStore.totalProgress.speed && writeFlashStore.totalProgress.speed > 0" class="text-primary font-medium">
                    {{ formatSpeed(writeFlashStore.totalProgress.speed) }}
                  </span>
                  <span v-if="writeFlashStore.totalProgress.eta && writeFlashStore.totalProgress.eta > 0 && writeFlashStore.totalProgress.percentage < 100" class="text-warning font-medium">
                    {{ formatETA(writeFlashStore.totalProgress.eta) }}
                  </span>
                  <span v-if="writeFlashStore.flashCompleted" class="text-success font-medium">
                    ✓ {{ t('writeFlash.allCompleted') }}
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
                  {{ t('writeFlash.waitingForTasks') }}
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
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { listen } from '@tauri-apps/api/event';
import { useLogStore } from '../stores/logStore';
import { useWriteFlashStore } from '../stores/writeFlashStore';
import { useDeviceStore } from '../stores/deviceStore';
import { ProgressHandler } from '../utils/progressHandler';
import { 
  parseSftoolParamFile, 
  isSftoolParamFile,
  formatValidationErrors 
} from '../utils/sftoolParamParser';
import type { 
  FlashFile
} from '../types/progress';
import FlashFileCard from '../components/FlashFileCard.vue';

const { t } = useI18n();
const logStore = useLogStore();
const writeFlashStore = useWriteFlashStore();
const deviceStore = useDeviceStore();

// 创建进度处理器实例
const progressHandler = new ProgressHandler(writeFlashStore);

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



// 格式化速度（模板中使用）
const formatSpeed = (bytesPerSecond: number | undefined): string => {
  if (!bytesPerSecond) return '-- KB/s';
  return formatFileSize(bytesPerSecond) + '/s';
};

// 处理进度事件 - 使用重构后的ProgressHandler
const handleProgressEvent = (event: any) => {
  progressHandler.handleEvent(event);
};

// 初始化日志
const initializeLog = () => {
  logStore.initializeLog();
};

// 组件挂载时初始化
onMounted(async () => {
  // 设置跨窗口事件监听器
  logStore.setupEventListeners();
  
  // 确保初次进入页面时进度/完成状态被清理，避免显示过期的完成提示
  if (!writeFlashStore.isFlashing) {
    writeFlashStore.resetProgressStates();
  }

  initializeLog();
  
  // 从存储中加载文件列表
  await writeFlashStore.loadFilesFromStorage();
  
  try {
    // 监听进度事件
    const unlistenProgress = await listen('flash-progress', (event) => {
      handleProgressEvent(event.payload);
    });

    // 监听拖拽进入事件
    const unlistenDragEnter = await listen(TauriEvent.DRAG_ENTER, () => {
      console.log('Tauri file drag enter');
      logStore.addMessage(t('writeFlash.log.dragEnter'));
      if (!writeFlashStore.isFlashing) {
        writeFlashStore.setWindowDragging(true);
      }
    });

    // 监听拖拽离开事件
    const unlistenDragLeave = await listen(TauriEvent.DRAG_LEAVE, () => {
      console.log('Tauri file drag leave');
      logStore.addMessage(t('writeFlash.log.dragLeave'));
      writeFlashStore.setWindowDragging(false);
    });

    // 监听拖拽悬停事件
    const unlistenDragOver = await listen(TauriEvent.DRAG_OVER, () => {
      console.log('Tauri file drag over');
      if (!writeFlashStore.isFlashing && !writeFlashStore.isWindowDragging) {
        writeFlashStore.setWindowDragging(true);
      }
    });

    // 监听文件拖拽释放事件
    const unlistenDragDrop = await listen(TauriEvent.DRAG_DROP, (event) => {
      console.log('Tauri file drop event:', event);
      logStore.addMessage(t('writeFlash.log.drop'));
      handleTauriFileDrop(event.payload);
      writeFlashStore.setWindowDragging(false);
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
    console.warn(t('writeFlash.log.cannotSetupDragListeners'), error);
    logStore.addMessage(t('writeFlash.log.cannotSetupDragListenersHint'), true);
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
    const added = writeFlashStore.addFile(newFile);
    if (added) {
      addedFiles.push(newFile);
    } else {
      duplicatedFiles.push(newFile.name);
    }
  }
  
  // 添加新文件
  if (addedFiles.length > 0) {
    logStore.addMessage(`${t('writeFlash.status.fileSelected')}: ${source}添加了 ${addedFiles.length} 个文件`);
    
    addedFiles.forEach((file) => {
      if (file.size && file.size > 0) {
        logStore.addMessage(`- ${file.name} (${formatFileSize(file.size)})`);
      } else {
        logStore.addMessage(`- ${file.name}`);
      }
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

// 处理sftool配置文件
const handleSftoolConfigFile = async (filePath: string): Promise<FlashFile[]> => {
  try {
    logStore.addMessage(t('writeFlash.sftoolConfig.detected'));
    logStore.addMessage(t('writeFlash.sftoolConfig.parsing'));

    // 解析配置文件（通过Rust后端）
    const parseResult = await parseSftoolParamFile(
      filePath, 
      deviceStore.selectedChip, 
      deviceStore.selectedMemoryType
    );
    
    logStore.addMessage(t('writeFlash.sftoolConfig.parseSuccess'));

    // 如果验证失败，显示错误并询问是否继续
    if (!parseResult.validation.isValid) {
      const errorMessages = formatValidationErrors(parseResult.validation);
      
      logStore.addMessage(t('writeFlash.sftoolConfig.validationFailed'), true);
      errorMessages.forEach(error => {
        logStore.addMessage(`- ${error}`, true);
      });

      // 显示当前和配置文件的设备信息
      logStore.addMessage(
        t('writeFlash.sftoolConfig.currentDevice', {
          chip: parseResult.validation.currentChip,
          memory: parseResult.validation.currentMemory
        })
      );
      logStore.addMessage(
        t('writeFlash.sftoolConfig.configDevice', {
          chip: parseResult.validation.configChip,
          memory: parseResult.validation.configMemory
        })
      );

      // 弹出警告对话框
      const shouldContinue = confirm(
        `${t('writeFlash.sftoolConfig.configMismatchWarning')}\n\n` +
        errorMessages.join('\n') + '\n\n' +
        t('writeFlash.sftoolConfig.continueAnyway')
      );

      if (!shouldContinue) {
        logStore.addMessage('用户取消了配置文件的使用');
        return [];
      }
    }

    // 转换提取的文件为FlashFile格式
    const flashFiles: FlashFile[] = parseResult.extractedFiles.map(extractedFile => ({
      id: writeFlashStore.generateFileId(),
      name: extractedFile.name,
      path: extractedFile.path,
      address: writeFlashStore.isAutoAddressFile(extractedFile.name) ? '' : extractedFile.address,
      addressError: '',
      size: extractedFile.size
    }));

    logStore.addMessage(t('writeFlash.sftoolConfig.extractedFiles', { count: flashFiles.length }));
    return flashFiles;

  } catch (error) {
    const errorMessage = `${t('writeFlash.sftoolConfig.parseFailed')}: ${error instanceof Error ? error.message : String(error)}`;
    logStore.addMessage(errorMessage, true);
    alert(errorMessage);
    return [];
  }
};

// Tauri 文件拖拽处理
const handleTauriFileDrop = async (payload: any) => {
  if (writeFlashStore.isFlashing) {
    logStore.addMessage(t('writeFlash.log.cannotAddWhileFlashing'));
    return;
  }

  const paths: string[] = payload?.paths || [];
  
  logStore.addMessage(t('writeFlash.log.detectedPaths', { count: paths.length }));
  
  if (paths.length === 0) {
    logStore.addMessage(t('writeFlash.log.cannotParseDrop'), true);
    logStore.addMessage(t('writeFlash.log.payloadContent', { payload: JSON.stringify(payload) }));
    return;
  }

  const droppedFiles: FlashFile[] = [];

  for (const path of paths) {
    if (typeof path !== 'string') {
      logStore.addMessage(t('writeFlash.log.skippingInvalidPath', { path: JSON.stringify(path) }));
      continue;
    }
    
    const fileName = path.split(/[\/\\]/).pop() || path;
    logStore.addMessage(t('writeFlash.log.processingFile', { name: fileName, path }));

    if (!writeFlashStore.isSupportedFile(fileName)) {
      logStore.addMessage(`${t('writeFlash.status.failed')}: ${t('writeFlash.status.unsupportedFileFormat')} - ${fileName}`, true);
      continue;
    }

    // 检查是否是sftool配置文件
    if (isSftoolParamFile(fileName)) {
      try {
        const configFiles = await handleSftoolConfigFile(path);
        droppedFiles.push(...configFiles);
      } catch (error) {
        logStore.addMessage(`${t('writeFlash.sftoolConfig.parseFailed')}: ${error}`, true);
      }
      continue;
    }

    // 常规固件文件处理
    let defaultAddress = '';
    if (!writeFlashStore.isAutoAddressFile(fileName)) {
      defaultAddress = '0x10000000';
    }

    droppedFiles.push({
      id: writeFlashStore.generateFileId(),
      name: fileName,
      path: path,
      address: defaultAddress,
      addressError: '',
      size: 0 
    });
  }

  addFilesWithDeduplication(droppedFiles, t('writeFlash.log.source.drag'));
};

// 验证地址格式

// 验证所有文件
// 验证所有文件，在开始烧录前调用
const validateAllFiles = (): boolean => {
  if (writeFlashStore.selectedFiles.length === 0) {
    logStore.addMessage(t('writeFlash.validation.noFiles'));
    return false;
  }
  
  // 组件层级已进行验证，此处仅检查store状态
  return writeFlashStore.canStartFlashing;
};

// 工具方法
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
        extensions: ['bin', 'hex', 'elf', 'axf', 'json']
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
        
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
        
        // 检查是否是sftool配置文件
        if (isSftoolParamFile(fileName)) {
          const configFiles = await handleSftoolConfigFile(filePath);
          files.push(...configFiles);
        } else {
          // 常规固件文件处理
          const fileContent = await readFile(filePath);
          
          files.push({
            id: writeFlashStore.generateFileId(),
            name: fileName,
            path: filePath,
            address: writeFlashStore.isAutoAddressFile(fileName) ? '' : '0x10000000',
            addressError: '',
            size: fileContent.length
          });
        }
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
  if (writeFlashStore.isFlashing) return;
  
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
  if (writeFlashStore.isFlashing) return;
  
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
      files: writeFlashStore.selectedFiles.map(file => ({
        file_path: file.path,
        address: writeFlashStore.isAutoAddressFile(file.name) ? 0 : parseInt(file.address || '0x10000000', 16)
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


// 开始烧录
const startFlashing = async () => {
  if (!validateAllFiles()) return;
  
  writeFlashStore.setFlashingState(true);
  logStore.setFlashing(true);
  
  // 重置所有状态
  progressHandler.resetAllStates();
  
  logStore.addMessage(`${t('writeFlash.status.starting')}`);
  logStore.addMessage(`准备烧录 ${writeFlashStore.selectedFiles.length} 个文件...`);
  
  try {
    for (const file of writeFlashStore.selectedFiles) {
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
    writeFlashStore.setFlashCompleted(false);
  } finally {
    writeFlashStore.setFlashingState(false);
    logStore.setFlashing(false);
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

/* 下载中的文件显示蓝色背景 */
.downloading-file {
  background: linear-gradient(135deg, rgba(82, 176, 225, 0.15), rgba(82, 176, 225, 0.25), rgba(82, 176, 225, 0.2));
  border: 1px solid rgba(82, 176, 225, 0.3);
  box-shadow: 0 0 8px rgba(82, 176, 225, 0.2);
  transition: all 0.3s ease;
}
</style>
