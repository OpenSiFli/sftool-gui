<template>
  <div class="device-connection-panel">
    <div class="card bg-base-100 shadow-lg p-3">
      <!-- <h3 class="text-lg font-bold mb-2">设备连接</h3> -->
      
      <!-- 芯片信息卡片 -->
      <div class="card bg-base-200 shadow-sm p-2 mb-2">
        <div class="flex justify-center mb-1">
          <h4 class="font-bold text-sm">芯片选择</h4>
        </div>
        
        <div class="flex gap-2">
          <div class="form-control w-1/2">
            <label class="label py-1 justify-center">
              <span class="label-text text-xs">芯片型号</span>
            </label>
            <div class="relative">
              <input 
                type="text" 
                v-model="chipSearchInput"
                @focus="handleFocus('chip')"
                @blur="handleBlur('chip')"
                @keydown="handleChipKeyDown"
                placeholder="请选择或搜索芯片型号" 
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
                  <div v-if="filteredChips.length === 0" class="p-2 text-gray-500 text-center text-xs">未找到匹配芯片型号</div>
                </div>
              </transition>
            </div>
          </div>
          
          <!-- 存储器类型选择 -->
          <div class="form-control w-1/2" v-if="selectedChip">
            <label class="label py-1 justify-center">
              <span class="label-text text-xs">存储器类型</span>
            </label>
            <div class="relative">
              <input 
                type="text" 
                v-model="memoryTypeInput"
                @focus="handleFocus('memoryType')"
                @blur="handleBlur('memoryType')"
                placeholder="请选择存储器类型" 
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
                  <div v-if="availableMemoryTypes.length === 0" class="p-2 text-gray-500 text-center text-xs">无可用存储器类型</div>
                </div>
              </transition>
            </div>
          </div>
          
          <!-- 存储器类型占位符（未选择芯片时） -->
          <div class="form-control w-1/2" v-else>
            <label class="label py-1 justify-center">
              <span class="label-text text-xs">存储器类型</span>
            </label>
            <div class="relative">
              <input 
                type="text" 
                placeholder="请先选择芯片型号" 
                class="input input-bordered input-sm w-full pr-10 transition-all duration-300 text-xs bg-base-200" 
                disabled
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 接口设置卡片 -->
      <div class="card bg-base-200 shadow-sm p-2 mb-2">
        <div class="flex justify-center mb-1">
          <h4 class="font-bold text-sm">接口设置</h4>
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
                  串口号
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
                  placeholder="请选择或搜索串口" 
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
                      <span class="loading loading-spinner loading-xs"></span> 正在加载串口...
                    </div>
                    <div v-else-if="availablePorts.length === 0" class="p-2 text-gray-500 text-center">未检测到串口设备</div>
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
                  波特率
                </span>
              </label>
              <div class="relative">
                <input 
                  type="text" 
                  v-model="baudRateInput"
                  @focus="handleFocus('baudRate')"
                  @blur="handleBlur('baudRate')"
                  placeholder="请选择或输入波特率" 
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
        {{ isConnected ? '断开连接' : '连接设备' }}
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
            设备信息
          </h4>
          <div>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs text-success">check_circle</span>
              状态: <span class="text-success">已连接</span>
            </p>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs">memory</span>
              设备: {{ selectedChip?.name }}
            </p>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs">sd_card</span>
              存储器: {{ selectedMemoryType }}
            </p>
            <p class="flex items-center gap-1">
              <span class="material-icons text-xs">settings_input_component</span>
              接口: {{ selectedInterface }}
            </p>
            <p v-if="selectedInterface === 'UART'" class="flex items-center gap-1">
              <span class="material-icons text-xs">cable</span>
              端口: {{ selectedPort?.name }} ({{ baudRateInput }} bps)
            </p>
          </div>
        </div>
      </transition>
    </div>
    
    <!-- 日志预览区域 -->
    <div class="mt-3">
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body p-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-sm flex items-center gap-1">
              <div 
                class="w-2 h-2 rounded-full transition-all duration-300"
                :class="logStore.isFlashing ? 'bg-success animate-pulse' : logStore.hasErrors ? 'bg-error' : 'bg-info'"
              ></div>
              系统日志
              <div class="badge badge-xs" :class="logStore.messages.length > 0 ? 'badge-primary' : 'badge-ghost'">
                {{ logStore.messages.length }}
              </div>
            </h4>
            <button 
              @click="openLogWindow"
              class="btn btn-xs btn-primary btn-outline"
              title="打开日志窗口"
            >
              <span class="material-icons text-xs">open_in_new</span>
            </button>
          </div>
          
          <!-- 日志预览内容 -->
          <div class="text-xs">
            <div v-if="logStore.messages.length === 0" class="text-base-content/60 italic text-center py-2">
              暂无日志消息
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
                还有 {{ logStore.messages.length - 3 }} 条消息...
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
import { ref, onMounted, computed, watch } from 'vue';
import { CHIP_MODELS, type ChipModel } from '../config/chips';
import { invoke } from '@tauri-apps/api/core';
import { useLogStore } from '../stores/logStore';
import { WindowManager } from '../services/windowManager';

const logStore = useLogStore();

interface PortInfo {
  name: string;
  port_type: string;
}

// 状态
const availablePorts = ref<PortInfo[]>([]);
const isLoadingPorts = ref(false);
const isConnected = ref(false);
const isConnecting = ref(false);

// 芯片下拉框状态 - 默认设置为 SF32LB52
const showChipDropdown = ref(false);
const chipSearchInput = ref('SF32LB52');
const selectedChip = ref<ChipModel | null>(CHIP_MODELS.find(chip => chip.id === 'SF32LB52') || null);
const tempChipInput = ref('SF32LB52'); // 保存临时输入，用于恢复搜索状态

// 存储器类型 - 默认设置为 NOR
const showMemoryTypeDropdown = ref(false);
const memoryTypeInput = ref('NOR');
const selectedMemoryType = ref<string | null>('NOR');
const tempMemoryTypeInput = ref('NOR');

// 芯片与存储器映射
const chipMemoryTypes = {
  'SF32LB52': ['NOR', 'NAND', 'SD'],
  'default': ['NOR']
};

// 获取当前芯片可用的存储器类型
const availableMemoryTypes = computed(() => {
  if (!selectedChip.value) return [];
  return chipMemoryTypes[selectedChip.value.id as keyof typeof chipMemoryTypes] || chipMemoryTypes.default;
});

// 接口类型
const selectedInterface = ref('UART');

// 串口下拉框状态
const showPortDropdown = ref(false);
const portSearchInput = ref('');
const selectedPort = ref<PortInfo | null>(null);
const tempPortInput = ref(''); // 保存临时输入，用于恢复搜索状态

// 波特率
const baudRates = [1000000, 1500000, 3000000, 6000000];
const showBaudRateDropdown = ref(false);
const baudRateInput = ref('1000000');
const tempBaudRateInput = ref('');

// 连接验证
const isConnectionValid = computed(() => {
  if (!selectedChip.value || !selectedMemoryType.value) return false;
  
  if (selectedInterface.value === 'UART') {
    return !!selectedPort.value && !!baudRateInput.value;
  } else {
    return true; // USB接口不需要其他配置
  }
});

// 过滤的芯片和串口列表
const filteredChips = computed(() => {
  if (!chipSearchInput.value) return CHIP_MODELS;
  
  const search = chipSearchInput.value.toLowerCase();
  return CHIP_MODELS.filter(chip => 
    chip.name.toLowerCase().includes(search)
  );
});

const filteredPorts = computed(() => {
  if (!portSearchInput.value) return availablePorts.value;
  
  const search = portSearchInput.value.toLowerCase();
  return availablePorts.value.filter(port => 
    port.name.toLowerCase().includes(search) ||
    port.port_type.toLowerCase().includes(search)
  );
});

// 刷新串口列表
const refreshPorts = async () => {
  try {
    isLoadingPorts.value = true;
    availablePorts.value = await invoke<PortInfo[]>('get_serial_ports');
  } catch (error) {
    console.error('获取串口列表失败:', error);
    availablePorts.value = [];
  } finally {
    isLoadingPorts.value = false;
  }
};

// 处理输入框获得焦点
const handleFocus = (type: 'chip' | 'port' | 'memoryType' | 'baudRate') => {
  // 关闭所有下拉框
  showChipDropdown.value = false;
  showPortDropdown.value = false;
  showMemoryTypeDropdown.value = false;
  showBaudRateDropdown.value = false;
  
  if (type === 'chip') {
    tempChipInput.value = chipSearchInput.value;
    chipSearchInput.value = ''; 
    showChipDropdown.value = true;
  } else if (type === 'port') {
    tempPortInput.value = portSearchInput.value;
    portSearchInput.value = ''; 
    showPortDropdown.value = true;
  } else if (type === 'memoryType') {
    tempMemoryTypeInput.value = memoryTypeInput.value;
    memoryTypeInput.value = '';
    showMemoryTypeDropdown.value = true;
  } else if (type === 'baudRate') {
    tempBaudRateInput.value = baudRateInput.value;
    showBaudRateDropdown.value = true;
  }
};

// 处理焦点失去事件
const handleBlur = (type: 'chip' | 'port' | 'memoryType' | 'baudRate') => {
  setTimeout(() => {
    if (type === 'chip') {
      if (showChipDropdown.value) {
        if (chipSearchInput.value === '') {
          chipSearchInput.value = selectedChip.value?.name || tempChipInput.value;
        }
        showChipDropdown.value = false;
      }
    } else if (type === 'port') {
      if (showPortDropdown.value) {
        if (portSearchInput.value === '') {
          portSearchInput.value = selectedPort.value?.name || tempPortInput.value;
        }
        showPortDropdown.value = false;
      }
    } else if (type === 'memoryType') {
      if (showMemoryTypeDropdown.value) {
        if (memoryTypeInput.value === '') {
          memoryTypeInput.value = selectedMemoryType.value || tempMemoryTypeInput.value;
        }
        showMemoryTypeDropdown.value = false;
      }
    } else if (type === 'baudRate') {
      showBaudRateDropdown.value = false;
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
  selectedChip.value = chip;
  chipSearchInput.value = chip.name;
  showChipDropdown.value = false;
  
  // 重置存储器类型
  selectedMemoryType.value = null;
  memoryTypeInput.value = '';
  
  // 如果只有一种存储器类型，则自动选择
  if (availableMemoryTypes.value.length === 1) {
    selectMemoryType(availableMemoryTypes.value[0]);
  }
};

// 选择存储器类型
const selectMemoryType = (memoryType: string) => {
  selectedMemoryType.value = memoryType;
  memoryTypeInput.value = memoryType;
  showMemoryTypeDropdown.value = false;
};

// 选择接口类型
const selectInterface = (interfaceType: string) => {
  selectedInterface.value = interfaceType;
};

// 选择串口
const selectPort = (port: PortInfo) => {
  selectedPort.value = port;
  portSearchInput.value = port.name;
  showPortDropdown.value = false;
};

// 选择波特率
const selectBaudRate = (rate: number) => {
  baudRateInput.value = rate.toString();
  showBaudRateDropdown.value = false;
};

// 切换下拉框显示
const toggleChipDropdown = () => {
  if (!showChipDropdown.value) {
    handleFocus('chip');
  } else {
    showChipDropdown.value = false;
  }
};

const togglePortDropdown = () => {
  if (!showPortDropdown.value) {
    handleFocus('port');
  } else {
    showPortDropdown.value = false;
  }
};

const toggleMemoryTypeDropdown = () => {
  if (!showMemoryTypeDropdown.value) {
    handleFocus('memoryType');
  } else {
    showMemoryTypeDropdown.value = false;
  }
};

const toggleBaudRateDropdown = () => {
  if (!showBaudRateDropdown.value) {
    showBaudRateDropdown.value = true;
  } else {
    showBaudRateDropdown.value = false;
  }
};

// 连接设备方法
const connectDevice = async () => {
  if (isConnected.value) {
    // 断开连接
    isConnecting.value = true;
    try {
      await invoke<void>('disconnect_device');
      isConnected.value = false;
    } catch (error) {
      console.error('断开设备失败:', error);
    } finally {
      isConnecting.value = false;
    }
  } else {
    // 检查必要的参数是否已选择
    if (!isConnectionValid.value) {
      alert('请完成所有必要的设备配置');
      return;
    }
    
    // 连接设备
    isConnecting.value = true;
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
      
      const success = await invoke<boolean>('connect_device', connectParams);
      
      isConnected.value = success;
      if (!success) {
        alert('连接设备失败，请检查设备连接后重试');
      }
    } catch (error) {
      console.error('连接设备失败:', error);
      alert('连接设备时出错');
    } finally {
      isConnecting.value = false;
    }
  }
};

// 监听选择的值变化
watch(selectedChip, (newChip) => {
  if (newChip) {
    chipSearchInput.value = newChip.name;
  }
});

watch(selectedPort, (newPort) => {
  if (newPort) {
    portSearchInput.value = newPort.name;
  }
});

// 监听接口类型变化
watch(selectedInterface, (newInterface) => {
  if (newInterface !== 'UART') {
    // 如果不是UART接口，重置串口和波特率
    selectedPort.value = null;
    portSearchInput.value = '';
  }
});

// 组件挂载时加载串口列表
onMounted(() => {
  refreshPorts();
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
    return '发现错误';
  } else if (logStore.isFlashing) {
    return '烧录中...';
  } else {
    return logStore.messages.length > 0 ? '有新日志' : '等待日志';
  }
};

const openLogWindow = async () => {
  try {
    await WindowManager.openLogWindow();
  } catch (error) {
    console.error('打开日志窗口失败:', error);
    logStore.addMessage('打开日志窗口失败: ' + error, true);
  }
};
</script>

<style scoped>
.device-connection-panel {
  width: 100%;
  max-width: 300px;
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