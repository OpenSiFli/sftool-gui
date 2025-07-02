<template>
  <div 
    class="p-6 min-h-screen relative" 
    @drop="handleWindowDrop"
    @dragover="handleWindowDragOver"
    @dragenter="handleWindowDragEnter"
    @dragleave="handleWindowDragLeave"
    :class="{ 'bg-primary/5 transition-colors duration-200': isWindowDragging }"
  >
    <!-- 全窗口拖拽提示覆盖层 -->
    <div 
      v-if="isWindowDragging" 
      class="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none"
      style="z-index: 9999;"
    >
      <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border-2 border-dashed border-primary animate-pulse">
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h2 class="text-2xl font-bold text-primary mb-2">{{ $t('writeFlash.dropFilesHere') }}</h2>
          <p class="text-gray-600 dark:text-gray-300">{{ $t('writeFlash.supportedFormats') }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">拖拽检测正常工作</p>
        </div>
      </div>
    </div>
    
    <!-- 调试按钮 -->
    <div class="absolute top-4 right-4 z-40 flex gap-2">
      <button 
        class="btn btn-sm btn-outline btn-secondary"
        @click="testDragFunction"
      >
        测试拖拽功能
      </button>
      <div class="badge badge-lg" :class="isWindowDragging ? 'badge-success' : 'badge-neutral'">
        {{ isWindowDragging ? '拖拽中' : '等待拖拽' }}
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
              @drop="handleDrop"
              @dragover.prevent
              @dragenter="handleDragEnter"
              @dragleave="handleDragLeave"
              :class="{ 
                'opacity-50 cursor-not-allowed': isFlashing,
                'border-primary bg-primary/5': isDragging
              }"
            >
              <div class="card-body">
                <div class="flex items-center justify-center gap-2 py-4 text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span v-if="!isDragging">{{ $t('writeFlash.clickToSelectFile') }}</span>
                  <span v-else class="text-primary font-medium">{{ $t('writeFlash.dropFilesHere') }}</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

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
const isDragging = ref(false);
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
    // 动态导入 Tauri v2 API
    const { listen } = await import('@tauri-apps/api/event');

    const unlisten = await listen<string[]>('tauri://file-drop', (event) => {
      console.log('Tauri file drop event:', event.payload);
      addLogMessage('收到Tauri文件拖拽事件');
      handleTauriFileDrop(event.payload);
      isWindowDragging.value = false;
    });

    const unlistenHover = await listen('tauri://file-drop-hover', () => {
      console.log('Tauri file drop hover');
      addLogMessage('文件拖拽悬停检测');
      if (!isFlashing.value) {
        isWindowDragging.value = true;
      }
    });

    const unlistenCancel = await listen('tauri://file-drop-cancelled', () => {
      console.log('Tauri file drop cancelled');
      addLogMessage('文件拖拽已取消');
      isWindowDragging.value = false;
    });

    addLogMessage('Tauri文件拖拽监听器设置成功');
    
    // 组件卸载时清理监听器
    onUnmounted(() => {
      unlisten();
      unlistenHover();
      unlistenCancel();
    });

  } catch (error) {
    console.warn('无法设置Tauri文件拖拽监听器, 将使用DOM事件作为备用:', error);
    addLogMessage(`警告: 无法设置Tauri文件拖拽监听器 - ${error}`);
    addLogMessage('尝试设置DOM事件处理作为备用方案...');
    
    // 作为备用方案，设置DOM事件监听器
    const globalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isFlashing.value) {
        isWindowDragging.value = true;
      }
    };
    
    const globalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isWindowDragging.value = false;
      console.log('DOM fallback drop:', e);
      addLogMessage('DOM备用拖拽释放事件');
      handleWindowDrop(e);
    };

    const globalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isWindowDragging.value = false;
    };
    
    window.addEventListener('dragover', globalDragOver);
    window.addEventListener('drop', globalDrop);
    window.addEventListener('dragleave', globalDragLeave);
    
    // 清理DOM事件监听器
    onUnmounted(() => {
      window.removeEventListener('dragover', globalDragOver);
      window.removeEventListener('drop', globalDrop);
      window.removeEventListener('dragleave', globalDragLeave);
    });
  }
});

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = ['.bin', '.hex', '.elf', '.axf'];

// 检查文件是否为支持的格式
const isSupportedFile = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(extension);
};

// 拖拽处理
const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = false;
  
  if (isFlashing.value) return;
  
  // 在Tauri中处理拖拽文件
  await processDraggedFiles(event);
};

// 拖拽进入/离开事件
const handleDragEnter = () => {
  if (!isFlashing.value) {
    isDragging.value = true;
  }
};

const handleDragLeave = () => {
  isDragging.value = false;
};

// 窗口级别的拖拽处理（DOM事件备用）
const handleWindowDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  console.log('Window drop event (DOM fallback)', event.dataTransfer?.files);
  addLogMessage('DOM拖拽释放事件触发');
  isWindowDragging.value = false;
  
  if (isFlashing.value) {
    addLogMessage('烧录进行中，无法添加文件');
    return;
  }
  
  // 使用DOM事件处理文件拖拽
  addLogMessage('使用DOM事件处理文件拖拽...');
  await processDraggedFiles(event);
};

// 处理拖拽文件的通用函数
const processDraggedFiles = async (event: DragEvent) => {
  console.log('Processing dragged files...', event.dataTransfer?.files);
  addLogMessage('检测到拖拽文件...');
  
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    addLogMessage('没有检测到有效文件');
    return;
  }
  
  addLogMessage(`检测到 ${files.length} 个文件`);
  const droppedFiles: FlashFile[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (!isSupportedFile(file.name)) {
      addLogMessage(`${t('writeFlash.status.failed')}: ${t('writeFlash.status.unsupportedFileFormat')} - ${file.name}`);
      continue;
    }
    
    // 根据文件类型生成默认地址
    let defaultAddress = '';
    if (!isAutoAddressFile(file.name)) {
      defaultAddress = '0x08000000'; // 默认Flash起始地址
    }
    
    // 在Tauri环境中，需要获取完整路径
    let filePath = file.name;
    try {
      // 尝试获取文件的完整路径（如果可能）
      if ((file as any).path) {
        filePath = (file as any).path;
      } else if ((file as any).webkitRelativePath) {
        filePath = (file as any).webkitRelativePath;
      }
    } catch (error) {
      console.warn('无法获取文件完整路径，使用文件名:', error);
    }
    
    droppedFiles.push({
      name: file.name,
      path: filePath,
      address: defaultAddress,
      addressError: '',
      size: file.size
    });
  }
  
  if (droppedFiles.length > 0) {
    selectedFiles.value.push(...droppedFiles);
    addLogMessage(`${t('writeFlash.status.fileSelected')}: 拖拽添加了 ${droppedFiles.length} 个文件`);
    droppedFiles.forEach(file => {
      addLogMessage(`- ${file.name} (${(file.size! / 1024).toFixed(1)}KB)`);
    });
  } else {
    addLogMessage('没有有效的固件文件被添加');
  }
};

// 处理Tauri文件拖拽事件
const handleTauriFileDrop = async (filePaths: string[]) => {
  console.log('Handling Tauri file drop:', filePaths);
  isWindowDragging.value = false;
  
  if (isFlashing.value) {
    addLogMessage('烧录进行中，无法添加文件');
    return;
  }
  
  addLogMessage('检测到文件拖拽...');
  
  if (!filePaths || filePaths.length === 0) {
    addLogMessage('没有检测到有效文件');
    return;
  }
  
  addLogMessage(`检测到 ${filePaths.length} 个文件`);
  const droppedFiles: FlashFile[] = [];
  
  try {
    const { readFile, exists } = await import('@tauri-apps/plugin-fs');
    
    for (const filePath of filePaths) {
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
      
      if (!isSupportedFile(fileName)) {
        addLogMessage(`${t('writeFlash.status.failed')}: ${t('writeFlash.status.unsupportedFileFormat')} - ${fileName}`);
        continue;
      }
      
      try {
        const fileExists = await exists(filePath);
        if (!fileExists) {
          addLogMessage(`${t('writeFlash.status.failed')}: 文件不存在 - ${fileName}`);
          continue;
        }
        
        const fileContent = await readFile(filePath);
        
        // 根据文件类型生成默认地址
        let defaultAddress = '';
        if (!isAutoAddressFile(fileName)) {
          defaultAddress = '0x08000000'; // 默认Flash起始地址
        }
        
        droppedFiles.push({
          name: fileName,
          path: filePath,
          address: defaultAddress,
          addressError: '',
          size: fileContent.length
        });
      } catch (error) {
        addLogMessage(`${t('writeFlash.status.failed')}: 读取文件失败 - ${fileName}: ${error}`);
      }
    }
    
    if (droppedFiles.length > 0) {
      selectedFiles.value.push(...droppedFiles);
      addLogMessage(`${t('writeFlash.status.fileSelected')}: 拖拽添加了 ${droppedFiles.length} 个文件`);
      droppedFiles.forEach(file => {
        addLogMessage(`- ${file.name} (${(file.size! / 1024).toFixed(1)}KB)`);
      });
    } else {
      addLogMessage('没有有效的固件文件被添加');
    }
  } catch (error) {
    addLogMessage(`${t('writeFlash.status.failed')}: 处理拖拽文件时出错 - ${error}`);
  }
};

const handleWindowDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  console.log('Window drag enter (DOM fallback)', event.dataTransfer?.types);
  addLogMessage(`DOM拖拽进入事件触发 - ${event.type}`);
  
  if (!isFlashing.value) {
    addLogMessage('检测到文件拖拽，显示覆盖层');
    isWindowDragging.value = true;
  }
};

const handleWindowDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  // 简化处理，每次dragover都确保覆盖层显示
  if (!isFlashing.value) {
    isWindowDragging.value = true;
  }
};

const handleWindowDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  console.log('Window drag leave (DOM fallback)', event.clientX, event.clientY);
  addLogMessage(`DOM拖拽离开事件触发 - ${event.type}`);
  
  // 简化处理，使用setTimeout避免快速的enter/leave事件
  setTimeout(() => {
    if (!event.relatedTarget || !document.contains(event.relatedTarget as Node)) {
      addLogMessage('拖拽真正离开，隐藏覆盖层');
      isWindowDragging.value = false;
    }
  }, 100);
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
          address: isAutoAddressFile(fileName) ? '' : '0x08000000',
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
      selectedFiles.value.push(...newFiles);
      newFiles.forEach(file => {
        addLogMessage(`${t('writeFlash.status.fileSelected')}: ${file.name} (${(file.size! / 1024).toFixed(1)}KB)`);
      });
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
      selectedFiles.value.push(...newFiles);
      addLogMessage(`${t('writeFlash.status.fileSelected')}: 批量选择了 ${newFiles.length} 个文件`);
      newFiles.forEach(file => {
        addLogMessage(`- ${file.name} (${(file.size! / 1024).toFixed(1)}KB)`);
      });
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

// 测试拖拽功能
const testDragFunction = () => {
  addLogMessage('=== 拖拽功能测试 ===');
  addLogMessage('手动切换拖拽覆盖层状态...');
  isWindowDragging.value = !isWindowDragging.value;
  
  setTimeout(() => {
    if (isWindowDragging.value) {
      addLogMessage('覆盖层显示正常');
      isWindowDragging.value = false;
      addLogMessage('覆盖层已隐藏');
    }
  }, 2000);
};
</script>