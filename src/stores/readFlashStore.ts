import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { load } from '@tauri-apps/plugin-store';
import type { TotalProgress } from '../types/progress';

// 读取任务接口
export interface ReadFlashTask {
    id: string;
    filePath: string;
    address: string;
    size: string;
    addressError?: string;
    sizeError?: string;
}

// 存储实例
let store: any = null;

// 初始化存储
const initStore = async () => {
    if (!store) {
        store = await load('readFlash.json', { autoSave: false });
    }
    return store;
};

export const useReadFlashStore = defineStore('readFlash', () => {
    // 基本状态
    const tasks = ref<ReadFlashTask[]>([]);
    const isReading = ref(false);

    // 进度状态
    const currentReadingFile = ref<string>('');
    const currentOperation = ref<string>('');
    const completedTasks = ref<Set<string>>(new Set());
    const readCompleted = ref(false);
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
    const canStartReading = computed(() => {
        if (tasks.value.length === 0) return false;

        return tasks.value.every((task) => {
            return task.filePath &&
                task.address &&
                !task.addressError &&
                task.size &&
                !task.sizeError;
        });
    });

    // 工具函数
    const generateTaskId = () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    };

    // Actions
    const addTask = (task?: Partial<ReadFlashTask>) => {
        const newTask: ReadFlashTask = {
            id: generateTaskId(),
            filePath: task?.filePath || '',
            address: task?.address || '0x10000000',
            size: task?.size || '',
            addressError: '',
            sizeError: ''
        };
        tasks.value.push(newTask);
        saveTasksToStorage();
        return newTask;
    };

    const removeTask = (index: number) => {
        if (index >= 0 && index < tasks.value.length) {
            tasks.value.splice(index, 1);
            saveTasksToStorage();
        }
    };

    const clearTasks = () => {
        tasks.value = [];
        saveTasksToStorage();
    };

    const updateTaskFilePath = (index: number, filePath: string) => {
        if (index >= 0 && index < tasks.value.length) {
            tasks.value[index].filePath = filePath;
            saveTasksToStorage();
        }
    };

    const updateTaskAddress = (index: number, address: string) => {
        if (index >= 0 && index < tasks.value.length) {
            tasks.value[index].address = address;
            saveTasksToStorage();
        }
    };

    const updateTaskSize = (index: number, size: string) => {
        if (index >= 0 && index < tasks.value.length) {
            tasks.value[index].size = size;
            saveTasksToStorage();
        }
    };

    const updateTaskAddressError = (index: number, error: string) => {
        if (index >= 0 && index < tasks.value.length) {
            tasks.value[index].addressError = error;
        }
    };

    const updateTaskSizeError = (index: number, error: string) => {
        if (index >= 0 && index < tasks.value.length) {
            tasks.value[index].sizeError = error;
        }
    };

    const setReadingState = (reading: boolean) => {
        isReading.value = reading;
    };

    const resetProgressStates = () => {
        currentReadingFile.value = '';
        currentOperation.value = '';
        completedTasks.value.clear();
        readCompleted.value = false;
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

    const setCurrentReadingFile = (fileName: string) => {
        currentReadingFile.value = fileName;
    };

    const setCurrentOperation = (operation: string) => {
        currentOperation.value = operation;
    };

    const addCompletedTask = (taskId: string) => {
        completedTasks.value.add(taskId);
    };

    const setReadCompleted = (completed: boolean) => {
        readCompleted.value = completed;
    };

    // 持久化存储相关
    const saveTasksToStorage = async () => {
        try {
            const storeInstance = await initStore();
            const tasksToSave = tasks.value.map(task => ({
                id: task.id,
                filePath: task.filePath,
                address: task.address,
                size: task.size
            }));
            await storeInstance.set('tasks', { value: tasksToSave });
            await storeInstance.save();
        } catch (error) {
            console.error('保存任务列表失败:', error);
        }
    };

    const loadTasksFromStorage = async () => {
        // 如果内存中已有任务，不从存储中覆盖，保持当前会话状态
        if (tasks.value.length > 0) {
            console.log(`已有 ${tasks.value.length} 个任务在内存中，跳过存储加载`);
            return;
        }

        try {
            const storeInstance = await initStore();
            const val = await storeInstance.get('tasks');
            if (val && val.value && Array.isArray(val.value)) {
                tasks.value = val.value.map((taskData: any) => ({
                    id: taskData.id || generateTaskId(),
                    filePath: taskData.filePath || '',
                    address: taskData.address || '0x10000000',
                    size: taskData.size || '',
                    addressError: '',
                    sizeError: ''
                }));
                console.log(`从存储中加载了 ${tasks.value.length} 个任务`);
            }
        } catch (error) {
            console.error('加载任务列表失败:', error);
        }
    };

    const clearStorage = async () => {
        try {
            const storeInstance = await initStore();
            await storeInstance.delete('tasks');
            await storeInstance.save();
        } catch (error) {
            console.error('清除任务列表存储失败:', error);
        }
    };

    return {
        // 状态
        tasks,
        isReading,
        currentReadingFile,
        currentOperation,
        completedTasks,
        readCompleted,
        totalProgress,

        // 计算属性
        canStartReading,

        // 工具函数
        generateTaskId,

        // Actions
        addTask,
        removeTask,
        clearTasks,
        updateTaskFilePath,
        updateTaskAddress,
        updateTaskSize,
        updateTaskAddressError,
        updateTaskSizeError,
        setReadingState,
        resetProgressStates,
        updateProgress,
        setCurrentReadingFile,
        setCurrentOperation,
        addCompletedTask,
        setReadCompleted,

        // 持久化存储
        saveTasksToStorage,
        loadTasksFromStorage,
        clearStorage
    };
});
