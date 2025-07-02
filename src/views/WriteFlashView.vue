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
            <!-- 已选择的文件 - 使用 transition-group 添加动画 -->
            <transition-group 
              name="file-list" 
              tag="div" 
              class="space-y-3"
            >
              <div 
                v-for="(file, index) in selectedFiles" 
                :key="`file-${index}`"
                class="card card-compact bg-base-200 shadow-sm file-list-item"
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
            </transition-group>
            
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
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ $t('writeFlash.log') }}</span>
              <button 
                class="btn btn-xs btn-circle btn-ghost"
                @click="isLogExpanded = !isLogExpanded"
                title="展开/折叠日志"
              >
                <svg v-if="isLogExpanded" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <button 
              class="btn btn-xs btn-ghost"
              @click="clearLog"
              :disabled="isFlashing"
            >
              {{ $t('writeFlash.clearLog') }}
            </button>
          </div>
          
          <!-- 日志容器 - 使用单一容器进行过渡 -->
          <div 
            class="log-container-wrapper bg-base-200 rounded-lg font-mono text-sm"
            :style="{ height: logContainerHeight + 'px' }"
          >
            <div class="p-4 h-full relative">
              <!-- 展开状态显示完整日志 -->
              <div
                v-if="isLogExpanded"
                class="h-full overflow-auto"
                ref="logContainer"
              >
                <pre>{{ logMessages.join('\n') }}</pre>
              </div>
              
              <!-- 折叠状态只显示最新一条 -->
              <div v-else class="truncate flex items-center h-full">
                <span class="truncate">{{ latestLogMessage }}</span>
              </div>
            </div>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
const isLogExpanded = ref(true); // 日志窗口展开状态
const logContainer = ref<HTMLElement | null>(null); // 日志容器DOM引用
const logContainerHeight = ref(200); // 日志容器高度，默认值

// 计算最新的日志消息用于折叠状态显示
const latestLogMessage = computed(() => {
  return logMessages.value.length > 0 ? logMessages.value[logMessages.value.length - 1] : '';
});

// 监听日志展开状态的变化，更新容器高度
watch(isLogExpanded, () => {
  updateLogContainerHeight();
});

// 更新日志容器高度
const updateLogContainerHeight = () => {
  if (isLogExpanded.value) {
    // 展开状态 - 使用nextTick确保DOM已更新
    nextTick(() => {
      if (logContainer.value) {
        // 获取内容实际高度
        const scrollHeight = logContainer.value.scrollHeight;
        const height = scrollHeight + 32; // 加上padding (16px * 2)
        // 设置最大高度为200px
        logContainerHeight.value = Math.min(height, 200);
      }
    });
  } else {
    // 折叠状态 - 固定高度
    logContainerHeight.value = 60; // 保持小高度显示单行
  }
};

// 初始化日志消息（在组件挂载后）
const initializeLog = () => {
  logMessages.value = [
    t('writeFlash.status.ready'),
    '拖拽功能已启用，可以直接将固件文件拖拽到窗口中'
  ];
  
  // 默认折叠日志窗口
  isLogExpanded.value = false;
  logContainerHeight.value = 40;
};

// 组件挂载时初始化
onMounted(async () => {
  initializeLog();
  updateLogContainerHeight();
  
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
    addLogMessage(`警告: 无法设置Tauri文件拖拽监听器，请使用文件选择按钮`, true);
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
  
  // 添加新文件 - 逐个添加以便动画可以逐个展示
  if (addedFiles.length > 0) {
    addLogMessage(`${t('writeFlash.status.fileSelected')}: ${source}添加了 ${addedFiles.length} 个文件`);
    
    // 使用延迟添加文件以使动画更明显
    addedFiles.forEach((file, index) => {
      setTimeout(() => {
        selectedFiles.value.push(file);
        
        // 如果有文件大小信息，则显示大小
        if (file.size && file.size > 0) {
          addLogMessage(`- ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        } else {
          addLogMessage(`- ${file.name}`);
        }
      }, index * 100); // 每个文件添加间隔100毫秒
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
    addLogMessage('错误: 无法从拖拽事件中解析出文件路径', true);
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
      addLogMessage(`${t('writeFlash.status.failed')}: ${t('writeFlash.status.unsupportedFileFormat')} - ${fileName}`, true);
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

// 移除文件 - 添加动画延迟
const removeFile = (index: number) => {
  const file = selectedFiles.value[index];
  
  // 标记文件为正在删除状态，可以触发CSS过渡效果
  const fileElement = document.querySelector(`.file-list-item:nth-child(${index + 1})`);
  if (fileElement) {
    fileElement.classList.add('file-list-leave-to');
  }
  
  // 延迟删除以便动画完成
  setTimeout(() => {
    selectedFiles.value.splice(index, 1);
    addLogMessage(`${t('writeFlash.status.fileRemoved')}: ${file.name}`);
  }, 300); // 300毫秒后删除，这样有足够时间显示动画
};

// 添加日志消息
const addLogMessage = (message: string, important: boolean = false) => {
  const timestamp = new Date().toLocaleTimeString();
  logMessages.value.push(`[${timestamp}] ${message}`);
  
  // 如果是重要消息，自动展开日志窗口
  if (important && !isLogExpanded.value) {
    isLogExpanded.value = true;
  } else if (isLogExpanded.value) {
    // 如果日志窗口已展开，则更新高度以适应新的内容
    nextTick(() => updateLogContainerHeight());
  }
  
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
    addLogMessage(`${t('writeFlash.status.completed')}`, true);
  } catch (error) {
    addLogMessage(`${t('writeFlash.status.failed')}: ${error}`, true);
  } finally {
    isFlashing.value = false;
  }
};
</script>

<style>
/* 文件列表项的过渡动画 */
.file-list-item {
  transition: all 0.5s;
}

/* 列表项进入和离开的动画 */
.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.5s ease;
}

.file-list-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}

.file-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 列表项移动的动画 */
.file-list-move {
  transition: transform 0.5s ease;
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