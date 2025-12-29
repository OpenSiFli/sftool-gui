<template>
  <div class="device-connection-panel">
      <!-- 芯片信息卡片 -->
      <div class="card bg-base-100 shadow-sm p-3 mb-3">
        <div class="flex justify-center mb-1">
          <h4 class="font-bold text-sm">{{ t('deviceConnection.chipSelection') }}</h4>
        </div>
        
        <div class="flex gap-2">
          <div class="form-control w-1/2">
            <label class="label py-1 justify-center">
              <span class="label-text text-xs">{{ t('deviceConnection.chipModel') }}</span>
            </label>
            <div class="relative">
              <input 
                type="text" 
                v-model="chipSearchInput"
                @focus="handleFocus('chip')"
                @blur="handleBlur('chip')"
                @keydown="handleChipKeyDown"
                :placeholder="t('deviceConnection.chipSearchPlaceholder')" 
                class="input input-bordered input-sm w-full pr-10 transition-all duration-300 text-xs" 
                :disabled="isConnected || isConnecting"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500" @click="toggleChipDropdown">
                <span class="material-icons transform transition-transform duration-300 text-sm" :class="{'rotate-180': showChipDropdown}">
                  keyboard_arrow_down
                </span>
              </div>
              <transition 
                enter-active-class="transition duration-200 ease-out" 
                enter-from-class="opacity-0 scale-95" 
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-150 ease-in" 
                leave-from-class="opacity-100 scale-100" 
                leave-to-class="opacity-0 scale-95"
              >
                <div v-if="showChipDropdown" class="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto origin-top">
                  <div 
                    v-for="chip in filteredChips" 
                    :key="chip.id" 
                    class="p-2 hover:bg-primary/10 cursor-pointer transition-colors duration-200"
                    @mousedown.prevent
                    @click="selectChip(chip)"
                  >
                    <div class="font-semibold text-xs">{{ chip.name }}</div>
                  </div>
                  <div v-if="filteredChips.length === 0" class="p-2 text-gray-500 text-center text-xs">{{ t('deviceConnection.noChipFound') }}</div>
                </div>
              </transition>
            </div>
          </div>
          
          <!-- 存储器类型选择 -->
          <div class="form-control w-1/2" v-if="selectedChip">
            <label class="label py-1 justify-center">
              <span class="label-text text-xs">{{ t('deviceConnection.storageType') }}</span>
            </label>
            <div class="relative">
              <input 
                type="text" 
                v-model="memoryTypeInput"
                @focus="handleFocus('memoryType')"
                @blur="handleBlur('memoryType')"
                :placeholder="t('deviceConnection.storageTypePlaceholder')" 
                class="input input-bordered input-sm w-full pr-10 transition-all duration-300 text-xs" 
                :disabled="isConnected || isConnecting"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500" @click="toggleMemoryTypeDropdown">
                <span class="material-icons transform transition-transform duration-300 text-sm" :class="{'rotate-180': showMemoryTypeDropdown}">
                  keyboard_arrow_down
                </span>
              </div>
              <transition 
                enter-active-class="transition duration-200 ease-out" 
                enter-from-class="opacity-0 scale-95" 
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-150 ease-in" 
                leave-from-class="opacity-100 scale-100" 
                leave-to-class="opacity-0 scale-95"
              >
                <div v-if="showMemoryTypeDropdown" class="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto origin-top">
                  <div 
                    v-for="memoryType in availableMemoryTypes" 
                    :key="memoryType" 
                    class="p-2 hover:bg-primary/10 cursor-pointer transition-colors duration-200"
                    @mousedown.prevent
                    @click="selectMemoryType(memoryType)"
                  >
                    <div class="font-semibold text-xs">{{ memoryType }}</div>
                  </div>
                  <div v-if="availableMemoryTypes.length === 0" class="p-2 text-gray-500 text-center text-xs">{{ t('deviceConnection.noStorageTypeAvailable') }}</div>
                </div>
              </transition>
            </div>
          </div>
          
          <!-- 存储器类型占位符（未选择芯片时） -->
          <div class="form-control w-1/2" v-else>
            <label class="label py-1 justify-center">
              <span class="label-text text-xs">{{ t('deviceConnection.storageType') }}</span>
            </label>
            <div class="relative">
              <input 
                type="text" 
                :placeholder="t('deviceConnection.selectChipFirst')" 
                class="input input-bordered input-sm w-full pr-10 transition-all duration-300 text-xs bg-base-200" 
                disabled
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 接口设置卡片 -->
      <div class="card bg-base-100 shadow-sm p-3 mb-3">
        <div class="flex justify-center mb-1">
          <h4 class="font-bold text-sm">{{ t('deviceConnection.interfaceSettings') }}</h4>
        </div>
        
        <!-- 接口类型选择 -->
        <div class="mb-2">
          <div class="flex justify-center gap-4">
            <div 
              class="flex items-center justify-center cursor-pointer p-2 rounded-lg transition-colors duration-200 w-20 h-10" 
              :class="selectedInterface === 'UART' ? 'bg-primary/20 border border-primary' : 'bg-base-100 hover:bg-base-300/50 border border-base-300'"
              @click="selectInterface('UART')"
              :disabled="isConnected || isConnecting"
            >
              <span class="font-medium" :class="selectedInterface === 'UART' ? 'text-primary' : ''">UART</span>
            </div>
            <div 
              class="flex items-center justify-center cursor-pointer p-2 rounded-lg transition-colors duration-200 w-20 h-10" 
              :class="selectedInterface === 'USB' ? 'bg-primary/20 border border-primary' : 'bg-base-100 hover:bg-base-300/50 border border-base-300'"
              @click="selectInterface('USB')"
              :disabled="isConnected || isConnecting"
            >
              <span class="font-medium" :class="selectedInterface === 'USB' ? 'text-primary' : ''">USB</span>
            </div>
          </div>
        </div>
        
        <!-- UART相关选项 -->
        <template v-if="selectedInterface === 'UART'">
          <div class="flex flex-wrap gap-2">
            <!-- 串口号选择 -->
            <div class="form-control grow min-w-[120px]">
              <label class="label py-1">
                <span class="label-text flex items-center gap-1">
                  <span class="material-icons text-xs">cable</span>
                  {{ t('deviceConnection.serialPort') }}
                </span>
                <button @click="refreshPorts" class="btn btn-xs btn-ghost transition-all duration-300" :disabled="isConnected || isConnecting">
                  <span class="material-icons text-sm" :class="{'animate-spin': isLoadingPorts}">refresh</span>
                </button>
              </label>
              <div class="relative">
                <input 
                  type="text" 
                  v-model="portSearchInput"
                  @focus="handleFocus('port')"
                  @blur="handleBlur('port')"
                  @keydown="handlePortKeyDown"
                  :placeholder="t('deviceConnection.serialPortPlaceholder')" 
                  class="input input-bordered input-sm w-full pr-10 transition-all duration-300" 
                  :disabled="isConnected || isConnecting"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500" @click="togglePortDropdown">
                  <span class="material-icons transform transition-transform duration-300 text-sm" :class="{'rotate-180': showPortDropdown}">
                    keyboard_arrow_down
                  </span>
                </div>
                <transition 
                  enter-active-class="transition duration-200 ease-out" 
                  enter-from-class="opacity-0 scale-95" 
                  enter-to-class="opacity-100 scale-100"
                  leave-active-class="transition duration-150 ease-in" 
                  leave-from-class="opacity-100 scale-100" 
                  leave-to-class="opacity-0 scale-95"
                >
                  <div v-if="showPortDropdown" class="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto origin-top">
                    <div v-if="isLoadingPorts" class="p-2 text-center">
                      <span class="loading loading-spinner loading-xs"></span> {{ t('deviceConnection.loadingPorts') }}
                    </div>
                    <div v-else-if="availablePorts.length === 0" class="p-2 text-gray-500 text-center">{{ t('deviceConnection.noPortFound') }}</div>
                    <div 
                      v-for="port in filteredPorts" 
                      :key="port.name" 
                      class="p-2 hover:bg-primary/10 cursor-pointer transition-colors duration-200"
                      @mousedown.prevent
                      @click="selectPort(port)"
                    >
                      <div class="font-semibold">{{ port.name }}</div>
                      <div class="text-xs text-gray-500">{{ port.port_type }}</div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            
            <!-- 波特率选择 -->
            <div class="form-control grow min-w-[120px]">
              <label class="label py-1">
                <span class="label-text flex items-center gap-1">
                  <span class="material-icons text-xs">speed</span>
                  {{ t('deviceConnection.baudRate') }}
                </span>
              </label>
              <div class="relative">
                <input 
                  type="text" 
                  v-model="baudRateInput"
                  @focus="handleFocus('baudRate')"
                  @blur="handleBlur('baudRate')"
                  :placeholder="t('deviceConnection.baudRatePlaceholder')" 
                  class="input input-bordered input-sm w-full pr-10 transition-all duration-300" 
                  :disabled="isConnected || isConnecting"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500" @click="toggleBaudRateDropdown">
                  <span class="material-icons transform transition-transform duration-300 text-sm" :class="{'rotate-180': showBaudRateDropdown}">
                    keyboard_arrow_down
                  </span>
                </div>
                <transition 
                  enter-active-class="transition duration-200 ease-out" 
                  enter-from-class="opacity-0 scale-95" 
                  enter-to-class="opacity-100 scale-100"
                  leave-active-class="transition duration-150 ease-in" 
                  leave-from-class="opacity-100 scale-100" 
                  leave-to-class="opacity-0 scale-95"
                >
                  <div v-if="showBaudRateDropdown" class="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto origin-top">
                    <div 
                      v-for="rate in baudRates" 
                      :key="rate" 
                      class="p-2 hover:bg-primary/10 cursor-pointer transition-colors duration-200"
                      @mousedown.prevent
                      @click="selectBaudRate(rate)"
                    >
                      <div class="font-semibold">{{ rate }}</div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </template>
      </div>
      
      <button 
        @click="connectDevice" 
        class="btn btn-primary btn-sm w-full mt-2 transition-all duration-300" 
        :class="{'btn-error': isConnected, 'hover:scale-[1.02]': !isConnecting}"
        :disabled="isLoadingPorts || isConnecting || (!isConnected && !isConnectionValid)"
      >
        <span v-if="isConnecting" class="loading loading-spinner loading-xs mr-2"></span>
        <span class="material-icons text-sm mr-1">{{ isConnected ? 'link_off' : 'link' }}</span>
        {{ isConnected ? t('deviceConnection.disconnectDevice') : t('deviceConnection.connectDevice') }}
      </button>
      
      <transition 
        enter-active-class="transition duration-300 ease-out" 
        enter-from-class="opacity-0 -translate-y-4" 
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in" 
        leave-from-class="opacity-100 translate-y-0" 
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div v-if="isConnected" class="mt-2 bg-base-200 p-2 rounded-lg shadow-inner text-xs">
          <h4 class="font-bold mb-1 flex items-center gap-1">
            <span class="material-icons text-xs">info</span>
            {{ t('deviceConnection.deviceInfo') }}
          </h4>
          <div>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs text-success">check_circle</span>
              {{ t('deviceConnection.status') }}: <span class="text-success">{{ t('deviceConnection.connected') }}</span>
            </p>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs">memory</span>
              {{ t('deviceConnection.device') }}: {{ selectedChip?.name }}
            </p>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs">sd_card</span>
              {{ t('deviceConnection.storage') }}: {{ selectedMemoryType }}
            </p>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs">settings_input_component</span>
              {{ t('deviceConnection.interface') }}: {{ selectedInterface }}
            </p>
            <p v-if="selectedInterface === 'UART'" class="flex items-center gap-1">
              <span class="material-icons text-xs">cable</span>
              {{ t('deviceConnection.port') }}: {{ selectedPort?.name }} ({{ baudRateInput }} bps)
            </p>
          </div>
        </div>
      </transition>
    <!-- 日志预览区域 -->
    <div class="mt-3">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-sm flex items-center gap-1">
              <div 
                class="w-2 h-2 rounded-full transition-all duration-300"
                :class="logStore.isFlashing ? 'bg-success animate-pulse' : logStore.hasErrors ? 'bg-error' : 'bg-info'"
              ></div>
              {{ t('deviceConnection.systemLog') }}
              <div class="badge badge-xs" :class="logStore.messages.length > 0 ? 'badge-primary' : 'badge-ghost'">
                {{ logStore.messages.length }}
              </div>
            </h4>
            <button 
              @click="openLogWindow"
              class="btn btn-xs btn-primary btn-outline"
              :title="t('deviceConnection.openLogWindow')"
            >
              <span class="material-icons text-xs">open_in_new</span>
            </button>
          </div>
          
          <!-- 日志预览内容 -->
          <div class="text-xs">
            <div v-if="logStore.messages.length === 0" class="text-base-content/60 italic text-center py-2">
              {{ t('deviceConnection.noLogMessages') }}
            </div>
            <div v-else class="space-y-1 max-h-32 overflow-y-auto">
              <!-- 只显示最近的3条日志 -->
              <div 
                v-for="(message, index) in recentLogMessages" 
                :key="index"
                class="text-xs p-2 rounded bg-base-100/50 border-l-2 transition-colors"
                :class="getLogMessageClass(message)"
              >
                {{ formatLogMessage(message) }}
              </div>
              <div v-if="logStore.messages.length > 3" class="text-center text-base-content/60 py-1">
                {{ t('deviceConnection.moreMessages', { count: logStore.messages.length - 3 }) }}
              </div>
            </div>
          </div>
          
          <!-- 状态显示 -->
          <div class="mt-2 pt-2 border-t border-base-300/30">
            <div class="flex items-center justify-center text-xs">
              <span :class="getStatusTextClass()">
                {{ getStatusText() }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { useLogStore } from '../stores/logStore';
import { useDeviceStore } from '../stores/deviceStore';
import { WindowManager } from '../services/windowManager';
import type { ChipModel } from '../config/chips';

interface PortInfo {
  name: string;
  port_type: string;
}

const { t } = useI18n();

const logStore = useLogStore();
const deviceStore = useDeviceStore();

// 从 store 中获取计算属性和状态 - 使用 storeToRefs 保持响应性
const {
  isConnected,
  isConnecting,
  selectedChip,
  chipSearchInput,
  showChipDropdown,
  tempChipInput,
  selectedMemoryType,
  memoryTypeInput,
  showMemoryTypeDropdown,
  tempMemoryTypeInput,
  selectedInterface,
  availablePorts,
  isLoadingPorts,
  selectedPort,
  portSearchInput,
  showPortDropdown,
  tempPortInput,
  baudRateInput,
  showBaudRateDropdown,
  baudRates,
  availableMemoryTypes,
  isConnectionValid,
  filteredChips,
  filteredPorts
} = storeToRefs(deviceStore);

// 刷新串口列表
const refreshPorts = async () => {
  try {
    deviceStore.setLoadingPorts(true);
    const ports = await invoke<PortInfo[]>('get_serial_ports');
    deviceStore.setAvailablePorts(ports);
  } catch (error) {
    console.error(t('errors.getPortsFailed'), error);
    deviceStore.setAvailablePorts([]);
  } finally {
    deviceStore.setLoadingPorts(false);
  }
};

// 处理输入框获得焦点
const handleFocus = (type: 'chip' | 'port' | 'memoryType' | 'baudRate') => {
  // 关闭所有下拉框
  deviceStore.setShowChipDropdown(false);
  deviceStore.setShowPortDropdown(false);
  deviceStore.setShowMemoryTypeDropdown(false);
  deviceStore.setShowBaudRateDropdown(false);
  
  if (type === 'chip') {
    deviceStore.setTempChipInput(chipSearchInput.value);
    deviceStore.setChipSearchInput(''); 
    deviceStore.setShowChipDropdown(true);
  } else if (type === 'port') {
    deviceStore.setTempPortInput(portSearchInput.value);
    deviceStore.setPortSearchInput(''); 
    deviceStore.setShowPortDropdown(true);
  } else if (type === 'memoryType') {
    deviceStore.setTempMemoryTypeInput(memoryTypeInput.value);
    deviceStore.setMemoryTypeInput('');
    deviceStore.setShowMemoryTypeDropdown(true);
  } else if (type === 'baudRate') {
    deviceStore.setTempBaudRateInput(baudRateInput.value);
    deviceStore.setShowBaudRateDropdown(true);
  }
};

// 处理焦点失去事件
const handleBlur = (type: 'chip' | 'port' | 'memoryType' | 'baudRate') => {
  setTimeout(() => {
    if (type === 'chip') {
      if (showChipDropdown.value) {
        if (chipSearchInput.value === '') {
          deviceStore.setChipSearchInput(selectedChip.value?.name || tempChipInput.value);
        }
        deviceStore.setShowChipDropdown(false);
      }
    } else if (type === 'port') {
      if (showPortDropdown.value) {
        if (portSearchInput.value === '') {
          deviceStore.setPortSearchInput(selectedPort.value?.name || tempPortInput.value);
        }
        deviceStore.setShowPortDropdown(false);
      }
    } else if (type === 'memoryType') {
      if (showMemoryTypeDropdown.value) {
        if (memoryTypeInput.value === '') {
          deviceStore.setMemoryTypeInput(selectedMemoryType.value || tempMemoryTypeInput.value);
        }
        deviceStore.setShowMemoryTypeDropdown(false);
      }
    } else if (type === 'baudRate') {
      deviceStore.setShowBaudRateDropdown(false);
    }
  }, 200);
};

// 键盘导航
const handleChipKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown' && !showChipDropdown.value) {
    handleFocus('chip');
  }
};

const handlePortKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown' && !showPortDropdown.value) {
    handleFocus('port');
  }
};

// 选择芯片
const selectChip = (chip: ChipModel) => {
  deviceStore.setSelectedChip(chip);
  deviceStore.setShowChipDropdown(false);
};

// 选择存储器类型
const selectMemoryType = (memoryType: string) => {
  deviceStore.setSelectedMemoryType(memoryType);
  deviceStore.setShowMemoryTypeDropdown(false);
};

// 选择接口类型
const selectInterface = (interfaceType: string) => {
  deviceStore.setSelectedInterface(interfaceType);
};

// 选择串口
const selectPort = (port: PortInfo) => {
  deviceStore.setSelectedPort(port);
  deviceStore.setShowPortDropdown(false);
};

// 选择波特率
const selectBaudRate = (rate: number) => {
  deviceStore.setBaudRate(rate.toString());
  deviceStore.setShowBaudRateDropdown(false);
};

// 切换下拉框显示
const toggleChipDropdown = () => {
  if (!showChipDropdown.value) {
    handleFocus('chip');
  } else {
    deviceStore.setShowChipDropdown(false);
  }
};

const togglePortDropdown = () => {
  if (!showPortDropdown.value) {
    handleFocus('port');
  } else {
    deviceStore.setShowPortDropdown(false);
  }
};

const toggleMemoryTypeDropdown = () => {
  if (!showMemoryTypeDropdown.value) {
    handleFocus('memoryType');
  } else {
    deviceStore.setShowMemoryTypeDropdown(false);
  }
};

const toggleBaudRateDropdown = () => {
  if (!showBaudRateDropdown.value) {
    deviceStore.setShowBaudRateDropdown(true);
  } else {
    deviceStore.setShowBaudRateDropdown(false);
  }
};

// Promise 超时封装，防止连接调用卡住导致 UI 一直处于连接中状态
const runWithTimeout = <T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect_timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// 连接设备方法
const connectDevice = async () => {
  if (isConnected.value) {
    // 断开连接
    deviceStore.setConnecting(true);
    try {
      await invoke<void>('disconnect_device');
      deviceStore.setConnected(false);
    } catch (error) {
      console.error(t('errors.disconnectFailed'), error);
    } finally {
      deviceStore.setConnecting(false);
    }
  } else {
    // 检查必要的参数是否已选择
    if (!isConnectionValid.value) {
      alert(t('deviceConnection.pleaseCompleteConfig'));
      return;
    }
    
    // 连接设备
    deviceStore.setConnecting(true);
    try {
      const connectParams: Record<string, any> = {
        chipModel: selectedChip.value!.id,
        memoryType: selectedMemoryType.value,
        interfaceType: selectedInterface.value
      };
      
      if (selectedInterface.value === 'UART') {
        connectParams.port = selectedPort.value!.name;
        connectParams.baudRate = parseInt(baudRateInput.value);
      }
      
      // 增加超时保护，防止调用异常时卡住连接中状态
      const success = await runWithTimeout(
        invoke<boolean>('connect_device', connectParams)
      );
      
      deviceStore.setConnected(success);
      if (!success) {
        alert(t('deviceConnection.connectFailedMessage'));
      }
    } catch (error) {
      console.error(t('errors.connectFailed'), error);
      deviceStore.setConnected(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`${t('deviceConnection.connectError')}: ${errorMessage}`);
    } finally {
      deviceStore.setConnecting(false);
    }
  }
};

// 组件挂载时加载串口列表和设备设置
onMounted(async () => {
  // 从存储加载设备设置
  await deviceStore.loadFromStorage();
  
  // 加载串口列表
  await refreshPorts();
  
  // 初始化日志事件监听
  logStore.setupEventListeners();
});

// 日志相关方法
const recentLogMessages = computed(() => {
  return logStore.messages.slice(-3); // 只显示最近3条
});

const formatLogMessage = (message: string) => {
  // 移除时间戳前缀，只显示消息内容
  let cleaned = message.replace(/^\[[\d:]+\]\s*/, '');
  // 如果消息太长，进行截断
  if (cleaned.length > 60) {
    return cleaned.substring(0, 57) + '...';
  }
  return cleaned;
};

const getLogMessageClass = (message: string) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('错误') || lowerMessage.includes('失败')) {
    return 'border-l-error text-error/90 bg-error/5';
  } else if (lowerMessage.includes('success') || lowerMessage.includes('completed') || lowerMessage.includes('成功') || lowerMessage.includes('完成')) {
    return 'border-l-success text-success/90 bg-success/5';
  } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn') || lowerMessage.includes('警告')) {
    return 'border-l-warning text-warning/90 bg-warning/5';
  }
  return 'border-l-info text-base-content/80 bg-base-100/50';
};

const getStatusTextClass = () => {
  if (logStore.hasErrors) {
    return 'text-error font-medium';
  } else if (logStore.isFlashing) {
    return 'text-success font-medium';
  } else {
    return 'text-info';
  }
};

const getStatusText = () => {
  if (logStore.hasErrors) {
    return t('deviceConnection.status') + ': ' + t('deviceConnection.connectionFailed');
  } else if (logStore.isFlashing) {
    return t('deviceConnection.status') + ': ' + t('writeFlash.status.starting');
  } else {
    return logStore.messages.length > 0 ? t('deviceConnection.moreMessages', { count: logStore.messages.length }) : t('deviceConnection.noLogMessages');
  }
};

const openLogWindow = async () => {
  try {
    await WindowManager.openLogWindow();
  } catch (error) {
    console.error(t('errors.getPortsFailed'), error);
    logStore.addMessage(t('errors.getPortsFailed') + ' ' + String(error), true);
  }
};
</script>

<style scoped>
.device-connection-panel {
  width: 300px;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.animate-pulse {
  animation: pulse 1.5s infinite ease-in-out;
}
</style> 
