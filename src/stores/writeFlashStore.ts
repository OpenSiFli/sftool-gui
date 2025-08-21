import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { load } from '@tauri-apps/plugin-store';
import type { 
  FlashFile, 
  ProgressItem, 
  TotalProgress 
} from '../types/progress';

// 存储实例
let store: any = null;

// 初始化存储
const initStore = async () => {
  if (!store) {
    store = await load('writeFlash.json', { autoSave: false });
  }
  return store;
};

export const useWriteFlashStore = defineStore('writeFlash', () => {
  // 基本状态
  const selectedFiles = ref<FlashFile[]>([]);
  const isFlashing = ref(false);
  const isWindowDragging = ref(false);
  
  // 进度状态
  const progressMap = ref<Map<number, ProgressItem>>(new Map());
  const currentFlashingFile = ref<string>('');
  const currentOperation = ref<string>('');
  const completedFiles = ref<Set<string>>(new Set());
  const flashCompleted = ref(false);
  const totalProgress = ref<TotalProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    eta: 0,
    currentFileName: '',
    completedCount: 0,
    totalCount: 0
  });
  
  // 计算属性
  const canStartFlashing = computed(() => {
    if (selectedFiles.value.length === 0) return false;
    
    return selectedFiles.value.every((file) => {
      if (isAutoAddressFile(file.name)) return true;
      return file.address && !file.addressError;
    });
  });
  
  // 工具函数
  const generateFileId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };
  
  const isAutoAddressFile = (fileName: string): boolean => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const AUTO_ADDRESS_EXTENSIONS = ['.elf', '.axf', '.hex'];
    return AUTO_ADDRESS_EXTENSIONS.includes(extension);
  };
  
  const isSupportedFile = (fileName: string): boolean => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const SUPPORTED_EXTENSIONS = ['.bin', '.hex', '.elf', '.axf'];
    return SUPPORTED_EXTENSIONS.includes(extension);
  };
  
  // Actions
  const addFile = (file: FlashFile) => {
    const existingIndex = selectedFiles.value.findIndex(f => f.path === file.path);
    if (existingIndex === -1) {
      selectedFiles.value.push(file);
      saveFilesToStorage();
      return true;
    }
    return false; // 文件已存在
  };
  
  const removeFile = (index: number) => {
    if (index >= 0 && index < selectedFiles.value.length) {
      selectedFiles.value.splice(index, 1);
      saveFilesToStorage();
    }
  };
  
  const clearFiles = () => {
    selectedFiles.value = [];
    saveFilesToStorage();
  };
  
  const updateFileAddress = (index: number, address: string) => {
    if (index >= 0 && index < selectedFiles.value.length) {
      selectedFiles.value[index].address = address;
      saveFilesToStorage();
    }
  };
  
  const updateFileAddressError = (index: number, error: string) => {
    if (index >= 0 && index < selectedFiles.value.length) {
      selectedFiles.value[index].addressError = error;
    }
  };
  
  const setFlashingState = (flashing: boolean) => {
    isFlashing.value = flashing;
  };
  
  const setWindowDragging = (dragging: boolean) => {
    isWindowDragging.value = dragging;
  };
  
  const resetProgressStates = () => {
    progressMap.value.clear();
    currentFlashingFile.value = '';
    currentOperation.value = '';
    completedFiles.value.clear();
    flashCompleted.value = false;
    totalProgress.value = {
      current: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      eta: 0,
      currentFileName: '',
      completedCount: 0,
      totalCount: 0
    };
  };
  
  const updateProgress = (progress: Partial<TotalProgress>) => {
    Object.assign(totalProgress.value, progress);
  };
  
  const setCurrentFlashingFile = (fileName: string) => {
    currentFlashingFile.value = fileName;
  };
  
  const setCurrentOperation = (operation: string) => {
    currentOperation.value = operation;
  };
  
  const addCompletedFile = (fileName: string) => {
    completedFiles.value.add(fileName);
  };
  
  const setFlashCompleted = (completed: boolean) => {
    flashCompleted.value = completed;
  };
  
  const updateProgressMap = (key: number, item: ProgressItem) => {
    progressMap.value.set(key, item);
  };
  
  // 持久化存储相关
  const saveFilesToStorage = async () => {
    try {
      const storeInstance = await initStore();
      const filesToSave = selectedFiles.value.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path,
        address: file.address,
        addressError: file.addressError,
        size: file.size
      }));
      await storeInstance.set('selectedFiles', { value: filesToSave });
      await storeInstance.save();
    } catch (error) {
      console.error('保存文件列表失败:', error);
    }
  };
  
  const loadFilesFromStorage = async () => {
    try {
      const storeInstance = await initStore();
      const val = await storeInstance.get('selectedFiles');
      if (val && val.value && Array.isArray(val.value)) {
        // 验证文件是否仍然存在
        const { exists } = await import('@tauri-apps/plugin-fs');
        const validFiles: FlashFile[] = [];
        
        for (const fileData of val.value) {
          try {
            // 检查文件是否仍然存在
            const fileExists = await exists(fileData.path);
            if (fileExists) {
              validFiles.push({
                id: fileData.id || generateFileId(),
                name: fileData.name,
                path: fileData.path,
                address: fileData.address || (isAutoAddressFile(fileData.name) ? '' : '0x10000000'),
                addressError: fileData.addressError || '',
                size: fileData.size || 0
              });
            }
          } catch (error) {
            console.warn(`验证文件存在性失败: ${fileData.path}`, error);
          }
        }
        
        selectedFiles.value = validFiles;
        
        // 如果有文件被移除，更新存储
        if (validFiles.length !== val.value.length) {
          await saveFilesToStorage();
        }
        
        console.log(`从存储中加载了 ${validFiles.length} 个有效文件`);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
    }
  };
  
  const clearStorage = async () => {
    try {
      const storeInstance = await initStore();
      await storeInstance.delete('selectedFiles');
      await storeInstance.save();
    } catch (error) {
      console.error('清除文件列表存储失败:', error);
    }
  };
  
  return {
    // 状态
    selectedFiles,
    isFlashing,
    isWindowDragging,
    progressMap,
    currentFlashingFile,
    currentOperation,
    completedFiles,
    flashCompleted,
    totalProgress,
    
    // 计算属性
    canStartFlashing,
    
    // 工具函数
    generateFileId,
    isAutoAddressFile,
    isSupportedFile,
    
    // Actions
    addFile,
    removeFile,
    clearFiles,
    updateFileAddress,
    updateFileAddressError,
    setFlashingState,
    setWindowDragging,
    resetProgressStates,
    updateProgress,
    setCurrentFlashingFile,
    setCurrentOperation,
    addCompletedFile,
    setFlashCompleted,
    updateProgressMap,
    
    // 持久化存储
    saveFilesToStorage,
    loadFilesFromStorage,
    clearStorage
  };
});
