<template>
  <div 
    class="p-6 min-h-screen relative" 
    :class="{ 'bg-primary/5 transition-colors duration-200': isWindowDragging }"
  >
    <!-- 全窗口拖拽提示覆盖层 -->
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
    
    <h1 class="text-2xl font-bold mb-6">{{ $t('writeFlash.title') }}</h1>
    
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <!-- 文件选择区域 -->
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text font-semibold">{{ $t('writeFlash.selectFiles') }}</span>
            <span class="label-text-alt text-xs">{{ $t('writeFlash.supportedFormats') }}</span>
          </label>
          
          <!-- 文件选择列表 -->
          <div class="space-y-3 mb-4">
            <!-- 已选择的文件 -->
            <div 
              v-for="(file, index) in selectedFiles" 
              :key="`file-${index}`"
              class="card card-compact bg-base-200 shadow-sm"
            >
              <div class="card-body">
                <div class="flex flex-col gap-3">
                  <!-- 第一行：文件名和移除按钮 -->
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">{{ file.name }}</div>
                    </div>
                    <button 
                      class="btn btn-sm btn-error btn-outline flex-shrink-0"
                      @click="removeFile(index)"
                      :disabled="isFlashing"
                    >
                      {{ $t('writeFlash.removeFile') }}
                    </button>
                  </div>
                  
                  <!-- 第二行：文件路径 -->
                  <div class="w-full relative group">
                    <input 
                      type="text" 
                      v-model="file.path"
                      class="input input-sm input-bordered w-full text-sm"
                      :placeholder="$t('writeFlash.pathPlaceholder')"
                    />
                    <!-- 自定义提示框 -->
                    <div class="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ $t('writeFlash.pathTooltip') }}
                    </div>
                  </div>
                  
                  <!-- 第三行：地址输入（如果需要） -->
                  <div class="w-full relative group" v-if="!isAutoAddressFile(file.name)">
                    <input 
                      type="text" 
                      v-model="file.address"
                      class="input input-sm input-bordered w-full"
                      :class="{ 'input-error': file.addressError }"
                      :placeholder="$t('writeFlash.addressPlaceholder')"
                      @input="validateAddress(index)"
                    />
                    <!-- 自定义提示框 -->
                    <div class="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ $t('writeFlash.addressTooltip') }}
                    </div>
                    <div class="text-xs text-error mt-1" v-if="file.addressError">
                      {{ file.addressError }}
                    </div>
                  </div>
                  
                  <!-- 自动地址标识 -->
                  <div class="w-full flex items-center" v-else>
                    <span class="badge badge-success badge-sm">{{ $t('writeFlash.autoAddress') }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 空白选择框 - 支持拖拽上传 -->
            <div 
              class="card card-compact bg-base-100 border-2 border-dashed border-base-300 hover:border-primary cursor-pointer transition-colors"
              @click="handleSelectFile"
              :class="{ 
                'opacity-50 cursor-not-allowed': isFlashing
              }"
            >
              <div class="card-body">
                <div class="flex items-center justify-center gap-2 py-4 text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{{ $t('writeFlash.clickToSelectFile') }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 批量选择按钮 -->
          <div class="mb-4 flex justify-start">
            <button 
              class="btn btn-outline btn-sm w-full sm:w-auto"
              @click="handleSelectMultipleFiles"
              :disabled="isFlashing"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ $t('writeFlash.addMultipleFiles') }}
            </button>
          </div>
        </div>
        
        <!-- 进度条 -->
        <div class="mt-8">
          <div class="flex justify-between mb-2">
            <span class="font-medium">{{ $t('writeFlash.progress') }}</span>
            <span class="text-sm">{{ progressPercent }}%</span>
          </div>
          <progress 
            class="progress progress-primary w-full" 
            :value="progressPercent" 
            max="100"
          ></progress>
        </div>
        
        <!-- 日志区域 -->
        <div class="mt-6">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium">{{ $t('writeFlash.log') }}</span>
            <button 
              class="btn btn-xs btn-ghost"
              @click="clearLog"
              :disabled="isFlashing"
            >
              {{ $t('writeFlash.clearLog') }}
            </button>
          </div>
          <div class="bg-base-200 p-4 rounded-lg h-32 overflow-auto font-mono text-sm">
            <pre>{{ logMessages.join('\n') }}</pre>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="card-actions justify-end mt-6">
          <button 
            class="btn btn-primary" 
            :disabled="!canStartFlashing || isFlashing" 
            @click="startFlashing"
          >
            <span v-if="isFlashing" class="loading loading-spinner loading-sm mr-2"></span>
            {{ $t('writeFlash.startFlash') }}
          </button>
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

const { t } = useI18n();

// 文件类型定义
interface FlashFile {
  name: string;
  path: string;
  address?: string;
  addressError?: string;
  size?: number;
}

// 状态管理
const selectedFiles = ref<FlashFile[]>([]);
const progressPercent = ref(0);
const isFlashing = ref(false);
const logMessages = ref<string[]>([]);
const isWindowDragging = ref(false);

// 初始化日志消息（在组件挂载后）
const initializeLog = () => {
  logMessages.value = [
    t('writeFlash.status.ready'),
    '拖拽功能已启用，可以直接将固件文件拖拽到窗口中'
  ];
};

// 组件挂载时初始化
onMounted(async () => {
  initializeLog();
  
  addLogMessage('正在初始化Tauri文件拖拽监听器...');
  
  try {
    // 监听拖拽进入事件
    const unlistenDragEnter = await listen(TauriEvent.DRAG_ENTER, () => {
      console.log('Tauri file drag enter');
      addLogMessage('检测到文件拖拽进入窗口');
      if (!isFlashing.value) {
        isWindowDragging.value = true;
      }
    });

    // 监听拖拽离开事件
    const unlistenDragLeave = await listen(TauriEvent.DRAG_LEAVE, () => {
      console.log('Tauri file drag leave');
      addLogMessage('文件拖拽离开窗口');
      isWindowDragging.value = false;
    });

    // 监听拖拽悬停事件
    const unlistenDragOver = await listen(TauriEvent.DRAG_OVER, () => {
      console.log('Tauri file drag over');
      // 拖拽悬停时保持覆盖层显示
      if (!isFlashing.value && !isWindowDragging.value) {
        isWindowDragging.value = true;
      }
    });

    // 监听文件拖拽释放事件
    const unlistenDragDrop = await listen(TauriEvent.DRAG_DROP, (event) => {
      console.log('Tauri file drop event:', event);
      addLogMessage('检测到文件拖拽释放');
      handleTauriFileDrop(event.payload);
      isWindowDragging.value = false; // 拖拽结束后隐藏覆盖层
    });

    addLogMessage('Tauri文件拖拽监听器设置成功');
    
    // 存储清理函数以便在组件卸载时调用
    (window as any).__tauriUnlisteners = {
      unlistenDragEnter,
      unlistenDragLeave,
      unlistenDragOver,
      unlistenDragDrop
    };

  } catch (error) {
    console.warn('无法设置Tauri文件拖拽监听器:', error);
    addLogMessage(`警告: 无法设置Tauri文件拖拽监听器，请使用文件选择按钮`);
  }
});

// 组件卸载时清理监听器
onUnmounted(() => {
  const unlisteners = (window as any).__tauriUnlisteners;
  if (unlisteners) {
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
    // 检查是否已存在相同路径的文件
    const existingFile = selectedFiles.value.find(file => file.path === newFile.path);
    if (existingFile) {
      duplicatedFiles.push(newFile.name);
      continue;
    }
    
    addedFiles.push(newFile);
  }
  
  // 添加新文件
  if (addedFiles.length > 0) {
    selectedFiles.value.push(...addedFiles);
    addLogMessage(`${t('writeFlash.status.fileSelected')}: ${source}添加了 ${addedFiles.length} 个文件`);
    addedFiles.forEach(file => {
      // 如果有文件大小信息，则显示大小
      if (file.size && file.size > 0) {
        addLogMessage(`- ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      } else {
        addLogMessage(`- ${file.name}`);
      }
    });
  }
  
  // 提示重复文件
  if (duplicatedFiles.length > 0) {
    addLogMessage(`跳过重复文件 (${duplicatedFiles.length}个): ${duplicatedFiles.join(', ')}`);
  }
  
  if (addedFiles.length === 0 && duplicatedFiles.length === 0) {
    addLogMessage('没有有效的固件文件被添加');
  }
};

// Tauri 文件拖拽处理
const handleTauriFileDrop = async (payload: any) => {
  if (isFlashing.value) {
    addLogMessage('烧录进行中，无法添加文件');
    return;
  }

  // Tauri v2 的 DRAG_DROP 事件 payload 是对象，包含 paths 数组
  const paths: string[] = payload?.paths || [];
  
  addLogMessage(`解析结果: 检测到 ${paths.length} 个文件路径`);
  
  if (paths.length === 0) {
    addLogMessage('错误: 无法从拖拽事件中解析出文件路径');
    addLogMessage(`实际payload内容: ${JSON.stringify(payload)}`);
    return;
  }

  const droppedFiles: FlashFile[] = [];

  for (const path of paths) {
    if (typeof path !== 'string') {
      addLogMessage(`跳过无效路径: ${JSON.stringify(path)}`);
      continue;
    }
    
    const fileName = path.split(/[\/\\]/).pop() || path;
    addLogMessage(`处理文件: ${fileName} (路径: ${path})`);

    if (!isSupportedFile(fileName)) {
      addLogMessage(`${t('writeFlash.status.failed')}: ${t('writeFlash.status.unsupportedFileFormat')} - ${fileName}`);
      continue;
    }

    // 根据文件类型生成默认地址
    let defaultAddress = '';
    if (!isAutoAddressFile(fileName)) {
      defaultAddress = '0x10000000'; // 默认Flash起始地址
    }

    droppedFiles.push({
      name: fileName,
      path: path,
      address: defaultAddress,
      addressError: '',
      size: 0 
    });
  }

  // 使用统一的去重函数添加文件
  addFilesWithDeduplication(droppedFiles, '拖拽');
};

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = ['.bin', '.hex', '.elf', '.axf'];

// 检查文件是否为支持的格式
const isSupportedFile = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(extension);
};

// 自动地址文件类型（不需要手动输入地址）
const AUTO_ADDRESS_EXTENSIONS = ['.elf', '.axf', '.hex'];

// 检查是否为自动地址文件
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
  
  // 检查十六进制格式
  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(file.address)) {
    file.addressError = t('writeFlash.validation.invalidAddress');
    return false;
  }
  
  // 检查地址范围
  const addressValue = parseInt(file.address, 16);
  if (addressValue > 0xFFFFFFFF) {
    file.addressError = t('writeFlash.validation.addressTooLarge');
    return false;
  }
  
  // 检查地址重复
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
    addLogMessage(t('writeFlash.validation.noFiles'));
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

// 文件选择API
const selectFile = async (multiple: boolean = false): Promise<FlashFile[]> => {
  try {
    // 动态导入 Tauri v2 插件
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
          addLogMessage(`${t('writeFlash.status.failed')}: 文件不存在 - ${filePath}`);
          continue;
        }
        
        const fileContent = await readFile(filePath);
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
        
        files.push({
          name: fileName,
          path: filePath,
          address: isAutoAddressFile(fileName) ? '' : '0x10000000',
          addressError: '',
          size: fileContent.length
        });
      } catch (error) {
        addLogMessage(`${t('writeFlash.status.failed')}: 读取文件失败 - ${filePath}: ${error}`);
      }
    }
    
    return files;
  } catch (error) {
    addLogMessage(`${t('writeFlash.status.failed')}: ${error}`);
    return [];
  }
};

// 选择单个文件（通过空白框点击）
const handleSelectFile = async () => {
  if (isFlashing.value) return;
  
  try {
    const newFiles = await selectFile(false);
    if (newFiles.length > 0) {
      // 使用统一的去重函数添加文件
      addFilesWithDeduplication(newFiles, '单文件选择');
    }
  } catch (error) {
    addLogMessage(`${t('writeFlash.status.failed')}: ${error}`);
  }
};

// 选择多个文件
const handleSelectMultipleFiles = async () => {
  if (isFlashing.value) return;
  
  try {
    const newFiles = await selectFile(true);
    if (newFiles.length > 0) {
      // 使用统一的去重函数添加文件
      addFilesWithDeduplication(newFiles, '多文件选择');
    }
  } catch (error) {
    addLogMessage(`${t('writeFlash.status.failed')}: ${error}`);
  }
};

// 烧录过程
const flashProcess = async () => {
  try {
    // 动态导入 Tauri v2 API
    const { invoke } = await import('@tauri-apps/api/core');
    
    for (const file of selectedFiles.value) {
      addLogMessage(`${t('writeFlash.status.validating')}: ${file.name}`);
      
      // 验证文件
      const isValid = await invoke('validate_firmware_file', { filePath: file.path });
      if (!isValid) {
        throw new Error(`文件验证失败: ${file.name}`);
      }
      
      const address = isAutoAddressFile(file.name) ? 'auto' : file.address;
      addLogMessage(`${t('writeFlash.status.progress')}: ${file.name} -> ${address}`);
      
      // 开始烧录
      const result = await invoke('flash_firmware', {
        filePath: file.path,
        address: address === 'auto' ? null : parseInt(address!, 16)
      });
      
      if (!result) {
        throw new Error(`烧录失败: ${file.name}`);
      }
      
      // 更新进度
      const fileProgress = 100 / selectedFiles.value.length;
      const startProgress = progressPercent.value;
      progressPercent.value = startProgress + fileProgress;
      
      addLogMessage(`烧录完成: ${file.name}`);
    }
  } catch (error) {
    throw new Error(`烧录失败: ${error}`);
  }
};

// 移除文件
const removeFile = (index: number) => {
  const file = selectedFiles.value[index];
  selectedFiles.value.splice(index, 1);
  addLogMessage(`${t('writeFlash.status.fileRemoved')}: ${file.name}`);
};

// 添加日志消息
const addLogMessage = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  logMessages.value.push(`[${timestamp}] ${message}`);
  
  // 限制日志条数，避免内存过度使用
  if (logMessages.value.length > 100) {
    logMessages.value = logMessages.value.slice(-100);
  }
};

// 清除日志
const clearLog = () => {
  logMessages.value = [t('writeFlash.status.ready')];
};

// 开始烧录
const startFlashing = async () => {
  if (!validateAllFiles()) return;
  
  isFlashing.value = true;
  progressPercent.value = 0;
  addLogMessage(`${t('writeFlash.status.starting')}`);
  addLogMessage(`${t('writeFlash.status.connecting')}`);
  
  try {
    await flashProcess();
    progressPercent.value = 100;
    addLogMessage(`${t('writeFlash.status.completed')}`);
  } catch (error) {
    addLogMessage(`${t('writeFlash.status.failed')}: ${error}`);
  } finally {
    isFlashing.value = false;
  }
};
</script>