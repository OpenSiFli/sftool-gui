<template>
  <div class="p-6 h-screen flex flex-col overflow-hidden bg-base-100">
    <!-- 页面标题栏 -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-3xl font-bold text-base-content">{{ $t('stubConfig.title') }}</h1>
    </div>

    <!-- Tabs 导航 -->
    <div class="tabs tabs-boxed bg-base-100 shadow-md mb-4">
      <a class="tab" :class="{ 'tab-active': currentTab === 'storage' }" @click="currentTab = 'storage'">
        <span class="material-icons mr-2 text-lg">storage</span>
        {{ $t('stubConfig.tabs.storage') }}
      </a>
      <a class="tab" :class="{ 'tab-active': currentTab === 'hardware' }" @click="currentTab = 'hardware'">
        <span class="material-icons mr-2 text-lg">settings_input_component</span>
        {{ $t('stubConfig.tabs.hardware') }}
      </a>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex-1 overflow-hidden min-h-0 relative">
      <!-- 存储配置 Tab -->
      <Transition name="slide" mode="out-in">
        <div v-if="currentTab === 'storage'" key="storage" class="absolute inset-0 overflow-y-auto space-y-4">
          <!-- FLASH 配置 -->
          <div class="collapse collapse-arrow bg-base-100 shadow-lg" :class="{ 'collapse-open': flashConfig.expanded }">
            <div class="collapse-title" @click="toggleSection('flash')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-primary text-2xl">memory</span>
                  <h2 class="text-xl font-bold">{{ $t('stubConfig.flash.title') }}</h2>
                  <span class="badge badge-primary">{{ flashConfig.devices.length }}</span>
                </div>
                <button class="btn btn-primary btn-sm mr-4" @click.stop="addFlashDevice">
                  <span class="material-icons mr-1">add</span>
                  {{ $t('stubConfig.flash.addDevice') }}
                </button>
              </div>
            </div>
            <div class="collapse-content">
              <div v-if="flashConfig.devices.length > 0" class="space-y-3 mt-2">
                <div
                  v-for="(device, index) in flashConfig.devices"
                  :key="index"
                  class="collapse collapse-arrow bg-base-200"
                  :class="{ 'collapse-open': device.expanded }"
                >
                  <div class="collapse-title cursor-pointer" @click="device.expanded = !device.expanded">
                    <div class="flex items-center justify-between w-full">
                      <span class="font-medium">{{ $t('stubConfig.flash.device') }} {{ index + 1 }}</span>
                      <button class="btn btn-ghost btn-sm btn-circle" @click.stop="removeFlashDevice(index)">
                        <span class="material-icons text-error">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="collapse-content">
                    <div class="grid grid-cols-2 gap-3 pt-4">
                      <div class="form-control">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.media') }}</span>
                        </label>
                        <select v-model="device.media" class="select select-bordered select-sm">
                          <option value="nor">NOR Flash</option>
                          <option value="nand">NAND Flash</option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.driverIndex') }}</span>
                        </label>
                        <select v-model.number="device.driver_index" class="select select-bordered select-sm">
                          <option :value="0">0</option>
                          <option :value="1">1</option>
                          <option :value="2">2</option>
                          <option :value="3">3</option>
                          <option :value="4">4</option>
                          <option :value="5">5</option>
                        </select>
                      </div>

                      <div class="form-control col-span-2">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.capacity') }}</span>
                        </label>
                        <input
                          v-model="device.capacity_bytes"
                          type="text"
                          placeholder="16777216 / 0x1000000 / 16M"
                          class="input input-bordered input-sm font-mono"
                          :class="{ 'input-error': device.capacityError }"
                          @input="validateCapacity(device)"
                        />
                        <label class="label">
                          <span v-if="device.capacityError" class="label-text-alt text-error">
                            {{ device.capacityError }}
                          </span>
                          <span v-else class="label-text-alt">{{ $t('stubConfig.flash.capacityHint') }}</span>
                        </label>
                      </div>

                      <div class="form-control">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.manufacturerId') }}</span>
                        </label>
                        <input
                          v-model="device.manufacturer_id"
                          type="text"
                          placeholder="0x00"
                          class="input input-bordered input-sm font-mono"
                          :class="{ 'input-error': device.manufacturerIdError }"
                          @input="validateHexField(device, 'manufacturer_id')"
                        />
                        <label v-if="device.manufacturerIdError" class="label">
                          <span class="label-text-alt text-error">{{ device.manufacturerIdError }}</span>
                        </label>
                      </div>
                      <div class="form-control">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.deviceType') }}</span>
                        </label>
                        <input
                          v-model="device.device_type"
                          type="text"
                          placeholder="0x00"
                          class="input input-bordered input-sm font-mono"
                          :class="{ 'input-error': device.deviceTypeError }"
                          @input="validateHexField(device, 'device_type')"
                        />
                        <label v-if="device.deviceTypeError" class="label">
                          <span class="label-text-alt text-error">{{ device.deviceTypeError }}</span>
                        </label>
                      </div>
                      <div class="form-control">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.densityId') }}</span>
                        </label>
                        <input
                          v-model="device.density_id"
                          type="text"
                          placeholder="0x00"
                          class="input input-bordered input-sm font-mono"
                          :class="{ 'input-error': device.densityIdError }"
                          @input="validateHexField(device, 'density_id')"
                        />
                        <label v-if="device.densityIdError" class="label">
                          <span class="label-text-alt text-error">{{ device.densityIdError }}</span>
                        </label>
                      </div>
                      <div class="form-control">
                        <label class="label py-1">
                          <span class="label-text text-sm">{{ $t('stubConfig.flash.flags') }}</span>
                        </label>
                        <input
                          v-model="device.flags"
                          type="text"
                          placeholder="0x00"
                          class="input input-bordered input-sm font-mono"
                          :class="{ 'input-error': device.flagsError }"
                          @input="validateHexField(device, 'flags')"
                        />
                        <label v-if="device.flagsError" class="label">
                          <span class="label-text-alt text-error">{{ device.flagsError }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-center py-8 text-base-content/60">
                <span class="material-icons text-5xl mb-2">storage</span>
                <p>{{ $t('stubConfig.flash.noDevices') }}</p>
              </div>
            </div>
          </div>

          <!-- SDIO 配置 -->
          <div class="collapse collapse-arrow bg-base-100 shadow-lg" :class="{ 'collapse-open': sdioConfig.expanded }">
            <div class="collapse-title" @click="toggleSection('sdio')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-primary text-2xl">sd_card</span>
                  <h2 class="text-xl font-bold">{{ $t('stubConfig.sdio.title') }}</h2>
                </div>
                <div class="flex items-center gap-2 mr-4" @click.stop>
                  <span class="label-text">{{ $t('stubConfig.enable') }}</span>
                  <input type="checkbox" v-model="sdioConfig.enabled" class="toggle toggle-primary" />
                </div>
              </div>
            </div>
            <div class="collapse-content">
              <div v-if="sdioConfig.enabled" class="space-y-4 mt-2">
                <!-- 基地址 -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">{{ $t('stubConfig.sdio.baseAddress') }}</span>
                  </label>
                  <input
                    v-model="sdioConfig.base_address"
                    type="text"
                    placeholder="0x68000000"
                    class="input input-bordered font-mono"
                    :class="{ 'input-error': sdioConfig.addressError }"
                    @input="validateBaseAddress"
                  />
                  <label class="label">
                    <span v-if="sdioConfig.addressError" class="label-text-alt text-error">
                      {{ sdioConfig.addressError }}
                    </span>
                  </label>
                  <label class="flex flex-col space-y-1">
                    <span class="label-text-alt">{{ $t('stubConfig.sdio.baseAddressHint1') }}</span>
                    <span class="label-text-alt">{{ $t('stubConfig.sdio.baseAddressHint2') }}</span>
                    <span class="label-text-alt">{{ $t('stubConfig.sdio.baseAddressHint3') }}</span>
                    <span class="label-text-alt">{{ $t('stubConfig.sdio.baseAddressHint4') }}</span>
                  </label>
                </div>

                <!-- PIN 复用选择 -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">{{ $t('stubConfig.sdio.pinmux') }}</span>
                  </label>
                  <div class="space-y-2">
                    <label
                      class="label cursor-pointer justify-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <input
                        type="radio"
                        v-model="sdioConfig.pinmux"
                        value="clk_pa34_or_pa09"
                        class="radio radio-primary"
                      />
                      <div class="flex-1">
                        <span class="label-text font-medium">CLK: PA34 / PA09</span>
                        <p class="text-xs text-base-content/60 mt-1">{{ $t('stubConfig.sdio.pinmuxOption1') }}</p>
                      </div>
                    </label>
                    <label
                      class="label cursor-pointer justify-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <input
                        type="radio"
                        v-model="sdioConfig.pinmux"
                        value="clk_pa60_or_pa39"
                        class="radio radio-primary"
                      />
                      <div class="flex-1">
                        <span class="label-text font-medium">CLK: PA60 / PA39</span>
                        <p class="text-xs text-base-content/60 mt-1">{{ $t('stubConfig.sdio.pinmuxOption2') }}</p>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- 初始化顺序 -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">{{ $t('stubConfig.sdio.initSequence') }}</span>
                  </label>
                  <div class="space-y-2">
                    <label
                      class="label cursor-pointer justify-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <input
                        type="radio"
                        v-model="sdioConfig.init_sequence"
                        value="emmc_then_sd"
                        class="radio radio-primary"
                      />
                      <span class="label-text">{{ $t('stubConfig.sdio.emmcThenSd') }}</span>
                    </label>
                    <label
                      class="label cursor-pointer justify-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <input
                        type="radio"
                        v-model="sdioConfig.init_sequence"
                        value="sd_then_emmc"
                        class="radio radio-primary"
                      />
                      <span class="label-text">{{ $t('stubConfig.sdio.sdThenEmmc') }}</span>
                    </label>
                  </div>
                </div>

                <!-- 冲突检测 -->
                <div v-if="hasConflict" class="alert alert-warning">
                  <span class="material-icons">warning</span>
                  <span>{{ $t('stubConfig.sdio.conflictDetected') }}</span>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                <p>{{ $t('stubConfig.sdio.disabled') }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 硬件配置 Tab -->
      <Transition name="slide" mode="out-in">
        <div v-if="currentTab === 'hardware'" key="hardware" class="absolute inset-0 overflow-y-auto space-y-4">
          <!-- GPIO 配置 -->
          <div class="collapse collapse-arrow bg-base-100 shadow-lg" :class="{ 'collapse-open': pinConfig.expanded }">
            <div class="collapse-title" @click="toggleSection('pin')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-primary text-2xl">settings_input_component</span>
                  <h2 class="text-xl font-bold">{{ $t('stubConfig.pin.title') }}</h2>
                </div>
                <div class="flex items-center gap-2 mr-4" @click.stop>
                  <span class="label-text">{{ $t('stubConfig.enable') }}</span>
                  <input type="checkbox" v-model="pinConfig.enabled" class="toggle toggle-primary" />
                </div>
              </div>
            </div>
            <div class="collapse-content">
              <div v-if="pinConfig.enabled" class="space-y-3 mt-2">
                <div
                  v-for="(item, index) in pinConfig.items"
                  :key="index"
                  class="flex items-center gap-4 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <div class="flex items-center gap-2 flex-1">
                    <select v-model="item.port" class="select select-bordered select-sm w-24">
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PBR">PBR</option>
                    </select>
                    <input
                      v-model.number="item.number"
                      type="number"
                      min="0"
                      max="63"
                      :placeholder="$t('stubConfig.pin.pinNumber')"
                      class="input input-bordered input-sm w-20"
                    />
                  </div>

                  <div class="flex items-center gap-2">
                    <input
                      type="radio"
                      :name="`pin-${index}`"
                      value="low"
                      v-model="item.level"
                      class="radio radio-sm radio-primary"
                    />
                    <span class="text-sm">Low</span>

                    <input
                      type="radio"
                      :name="`pin-${index}`"
                      value="high"
                      v-model="item.level"
                      class="radio radio-sm radio-primary ml-2"
                    />
                    <span class="text-sm">High</span>
                  </div>

                  <button class="btn btn-ghost btn-sm btn-circle" @click="removePinConfig(index)">
                    <span class="material-icons text-error">close</span>
                  </button>
                </div>

                <button class="btn btn-outline btn-sm" @click="addPinConfig">
                  <span class="material-icons mr-1">add</span>
                  {{ $t('stubConfig.pin.addPin') }}
                </button>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                <p>{{ $t('stubConfig.pin.disabled') }}</p>
              </div>
            </div>
          </div>

          <!-- PMIC 配置 -->
          <div class="collapse collapse-arrow bg-base-100 shadow-lg" :class="{ 'collapse-open': pmicConfig.expanded }">
            <div class="collapse-title" @click="toggleSection('pmic')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="material-icons text-primary text-2xl">power</span>
                  <h2 class="text-xl font-bold">{{ $t('stubConfig.pmic.title') }}</h2>
                </div>
                <div class="flex items-center gap-2 mr-4" @click.stop>
                  <span class="label-text">{{ $t('stubConfig.enable') }}</span>
                  <input type="checkbox" v-model="pmicConfig.enabled" class="toggle toggle-primary" />
                </div>
              </div>
            </div>
            <div class="collapse-content">
              <div v-if="pmicConfig.enabled" class="space-y-4 mt-2">
                <!-- I2C 总线配置 -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">{{ $t('stubConfig.pmic.sclPort') }}</span>
                    </label>
                    <div class="flex gap-2">
                      <select v-model="pmicConfig.scl_port" class="select select-bordered select-sm w-24">
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PBR">PBR</option>
                      </select>
                      <input
                        v-model.number="pmicConfig.scl_pin"
                        type="number"
                        min="0"
                        max="63"
                        placeholder="0"
                        class="input input-bordered input-sm w-20"
                      />
                    </div>
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">{{ $t('stubConfig.pmic.sdaPort') }}</span>
                    </label>
                    <div class="flex gap-2">
                      <select v-model="pmicConfig.sda_port" class="select select-bordered select-sm w-24">
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PBR">PBR</option>
                      </select>
                      <input
                        v-model.number="pmicConfig.sda_pin"
                        type="number"
                        min="0"
                        max="63"
                        placeholder="1"
                        class="input input-bordered input-sm w-20"
                      />
                    </div>
                  </div>
                </div>

                <!-- 电源通道配置 -->
                <div class="divider">{{ $t('stubConfig.pmic.channels') }}</div>

                <div class="grid grid-cols-2 gap-2">
                  <label
                    v-for="channel in availablePmicChannels"
                    :key="channel"
                    class="label cursor-pointer justify-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      :value="channel"
                      v-model="pmicConfig.channels"
                      class="checkbox checkbox-sm checkbox-primary"
                    />
                    <span class="label-text text-sm font-mono">{{ channel }}</span>
                  </label>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                <p>{{ $t('stubConfig.pmic.disabled') }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 底部操作按钮 -->
    <div class="flex justify-between items-center mt-4 pt-4 border-t border-base-300">
      <!-- Stub 机制说明 弹窗触发 -->
      <button class="btn btn-ghost btn-sm" @click="openStubInfo">
        <span class="material-icons text-lg mr-1">info</span>
        {{ $t('stubConfig.stubInfo.title') }}
      </button>
      <div class="flex gap-3">
        <button class="btn btn-outline btn-sm" @click="importConfigFromFile">
          <span class="material-icons">folder_open</span>
          {{ $t('stubConfig.import') }}
        </button>
        <button class="btn btn-outline btn-sm" @click="exportConfigToFile">
          <span class="material-icons">download</span>
          {{ $t('stubConfig.export') }}
        </button>
        <button class="btn btn-outline btn-sm" @click="resetConfig">
          <span class="material-icons">refresh</span>
          {{ $t('stubConfig.reset') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Stub 机制说明弹窗 -->
  <div :class="['modal', showStubModal ? 'modal-open' : '']">
    <div class="modal-box max-w-3xl bg-base-100">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <span class="material-icons text-primary">info</span>
        {{ $t('stubConfig.stubInfo.title') }}
      </h3>
      <div class="space-y-2 mt-3 text-sm leading-relaxed">
        <p>{{ $t('stubConfig.stubInfo.body1') }}</p>
        <p>{{ $t('stubConfig.stubInfo.body2') }}</p>
        <p>{{ $t('stubConfig.stubInfo.body3') }}</p>
        <p>{{ $t('stubConfig.stubInfo.body4') }}</p>
      </div>

      <div class="modal-action mt-6">
        <button class="btn" @click="ackStubInfo">{{ $t('stubConfig.stubInfo.acknowledge') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLogStore } from '../stores/logStore';
import { useStubConfigStore } from '../stores/stubConfigStore';

const { t } = useI18n();
const logStore = useLogStore();
const stubConfigStore = useStubConfigStore();

// Stub 机制弹窗控制
const showStubModal = ref(false);

const openStubInfo = () => {
  showStubModal.value = true;
};

const ackStubInfo = () => {
  showStubModal.value = false;
};

// 从store获取响应式引用
const currentTab = computed({
  get: () => stubConfigStore.config.currentTab,
  set: value => {
    stubConfigStore.config.currentTab = value;
  },
});

const pinConfig = computed({
  get: () => stubConfigStore.config.pinConfig,
  set: value => {
    stubConfigStore.config.pinConfig = value;
  },
});

const pmicConfig = computed({
  get: () => stubConfigStore.config.pmicConfig,
  set: value => {
    stubConfigStore.config.pmicConfig = value;
  },
});

const sdioConfig = computed({
  get: () => stubConfigStore.config.sdioConfig,
  set: value => {
    stubConfigStore.config.sdioConfig = value;
  },
});

const flashConfig = computed({
  get: () => stubConfigStore.config.flashConfig,
  set: value => {
    stubConfigStore.config.flashConfig = value;
  },
});

// PMIC 可用通道
const availablePmicChannels = [
  '1v8_lvsw100_1',
  '1v8_lvsw100_2',
  '1v8_lvsw100_3',
  '1v8_lvsw100_4',
  '1v8_lvsw100_5',
  'vbat_hvsw150_1',
  'vbat_hvsw150_2',
  'ldo33',
  'ldo30',
  'ldo28',
];

// 计算是否有冲突
const hasConflict = computed(() => {
  // 简单的冲突检测逻辑
  return false;
});

// 展开/折叠控制
const toggleSection = (section: 'pin' | 'pmic' | 'sdio' | 'flash') => {
  switch (section) {
    case 'pin':
      pinConfig.value.expanded = !pinConfig.value.expanded;
      break;
    case 'pmic':
      pmicConfig.value.expanded = !pmicConfig.value.expanded;
      break;
    case 'sdio':
      sdioConfig.value.expanded = !sdioConfig.value.expanded;
      break;
    case 'flash':
      flashConfig.value.expanded = !flashConfig.value.expanded;
      break;
  }
};

// 添加 PIN 配置
const addPinConfig = () => {
  if (pinConfig.value.items.length >= 12) {
    logStore.addMessage(t('stubConfig.pin.maxReached'), true);
    return;
  }
  pinConfig.value.items.push({
    port: 'PA',
    number: 0,
    level: 'low',
  });
};

// 移除 PIN 配置
const removePinConfig = (index: number) => {
  pinConfig.value.items.splice(index, 1);
};

// 验证基地址
const validateBaseAddress = () => {
  const address = sdioConfig.value.base_address;

  if (!address) {
    sdioConfig.value.addressError = '';
    return;
  }

  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(address)) {
    sdioConfig.value.addressError = t('stubConfig.sdio.invalidAddress');
    return;
  }

  const addressValue = parseInt(address, 16);
  if (addressValue > 0xffffffff) {
    sdioConfig.value.addressError = t('stubConfig.sdio.addressTooLarge');
    return;
  }

  sdioConfig.value.addressError = '';
};

// 验证flash容量格式
const validateCapacity = (device: any) => {
  const value = device.capacity_bytes;

  if (!value) {
    device.capacityError = '';
    return;
  }

  const valueStr = String(value).trim();

  // 支持的格式：
  // 1. 十进制数字：16777216
  // 2. 十六进制：0x1000000
  // 3. 带单位：16M, 16MB, 1G, 1GB, 256K, 256KB

  // 检查十进制数字
  const decimalPattern = /^\d+$/;
  if (decimalPattern.test(valueStr)) {
    const num = parseInt(valueStr, 10);
    if (num > 0 && num <= 0xffffffff) {
      device.capacityError = '';
      return;
    }
  }

  // 检查十六进制
  const hexPattern = /^0x[0-9A-Fa-f]{1,8}$/;
  if (hexPattern.test(valueStr)) {
    const num = parseInt(valueStr, 16);
    if (num > 0 && num <= 0xffffffff) {
      device.capacityError = '';
      return;
    }
  }

  // 检查带单位的格式
  const unitPattern = /^[0-9]+[kKmMgG]$/;
  const match = valueStr.match(unitPattern);
  if (match) {
    const numValue = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    let bytes = 0;
    if (unit === 'K' || unit === 'KB') {
      bytes = numValue * 1024;
    } else if (unit === 'M' || unit === 'MB') {
      bytes = numValue * 1024 * 1024;
    } else if (unit === 'G' || unit === 'GB') {
      bytes = numValue * 1024 * 1024 * 1024;
    }

    if (bytes > 0 && bytes <= 0xffffffff) {
      device.capacityError = '';
      return;
    }
  }

  device.capacityError = t('stubConfig.flash.invalidCapacity');
};

// 验证十六进制字段
const validateHexField = (device: any, fieldName: string) => {
  const value = device[fieldName];
  const errorFieldName =
    fieldName === 'manufacturer_id'
      ? 'manufacturerIdError'
      : fieldName === 'device_type'
        ? 'deviceTypeError'
        : fieldName === 'density_id'
          ? 'densityIdError'
          : 'flagsError';

  if (!value) {
    device[errorFieldName] = '';
    return;
  }

  const valueStr = String(value).trim();

  // 检查十六进制格式：0x00 到 0xFF
  const hexPattern = /^0x[0-9a-fA-F]{1,2}$/;
  if (hexPattern.test(valueStr)) {
    const num = parseInt(valueStr, 16);
    if (num >= 0 && num <= 0xff) {
      device[errorFieldName] = '';
      return;
    }
  }

  device[errorFieldName] = t('stubConfig.flash.invalidHexValue');
};

// 添加 FLASH 设备
const addFlashDevice = () => {
  if (flashConfig.value.devices.length >= 12) {
    logStore.addMessage(t('stubConfig.flash.maxReached'), true);
    return;
  }
  flashConfig.value.devices.push({
    media: 'nor',
    driver_index: 0,
    manufacturer_id: '',
    device_type: '',
    density_id: '',
    flags: '',
    capacity_bytes: '', // 16MB
    expanded: true,
    capacityError: '',
    manufacturerIdError: '',
    deviceTypeError: '',
    densityIdError: '',
    flagsError: '',
  });
};

// 移除 FLASH 设备
const removeFlashDevice = (index: number) => {
  flashConfig.value.devices.splice(index, 1);
};

// 保存配置草稿到 Pinia store
const saveConfigDraft = () => {
  stubConfigStore.saveConfig({
    currentTab: currentTab.value,
    pinConfig: pinConfig.value,
    pmicConfig: pmicConfig.value,
    sdioConfig: sdioConfig.value,
    flashConfig: flashConfig.value,
  });
};

// 保存配置草稿到本地存储
const saveConfigToLocal = async () => {
  try {
    const config = exportConfig();
    const jsonStr = JSON.stringify(config, null, 2);

    // 使用 Tauri 的路径和文件系统 API
    const { appDataDir } = await import('@tauri-apps/api/path');
    const { writeTextFile, exists, mkdir } = await import('@tauri-apps/plugin-fs');

    // 获取应用数据目录
    const dataDir = await appDataDir();
    const configDir = `${dataDir}/stub_config`;
    const configPath = `${configDir}/draft.json`;

    // 确保目录存在
    const dirExists = await exists(configDir);
    if (!dirExists) {
      await mkdir(configDir, { recursive: true });
    }

    // 写入文件
    await writeTextFile(configPath, jsonStr);
  } catch (error) {
    console.error('Failed to save config draft:', error);
  }
};

const resetConfig = () => {
  stubConfigStore.resetConfig();
  logStore.addMessage(t('stubConfig.resetSuccess'));
};

// 导出配置为 JSON
const exportConfig = () => {
  const config: any = {};

  // 只添加启用的配置
  if (pinConfig.value.enabled && pinConfig.value.items.length > 0) {
    config.pins = pinConfig.value.items.map(item => ({
      port: item.port,
      number: item.number,
      level: item.level,
    }));
  }

  if (pmicConfig.value.enabled) {
    config.pmic = {
      disabled: pmicConfig.value.disabled,
      scl_port: pmicConfig.value.scl_port,
      scl_pin: pmicConfig.value.scl_pin,
      sda_port: pmicConfig.value.sda_port,
      sda_pin: pmicConfig.value.sda_pin,
      channels: pmicConfig.value.channels,
    };
  }

  if (sdioConfig.value.enabled) {
    config.sd0 = {
      base_address: sdioConfig.value.base_address,
      pinmux: sdioConfig.value.pinmux,
      init_sequence: sdioConfig.value.init_sequence,
    };
  }

  if (flashConfig.value.devices.length > 0) {
    config.flash = flashConfig.value.devices.map(device => ({
      media: device.media,
      driver_index: device.driver_index,
      manufacturer_id: device.manufacturer_id,
      device_type: device.device_type,
      density_id: device.density_id,
      flags: device.flags,
      capacity_bytes: device.capacity_bytes,
    }));
  }

  return config;
};

// 导出到文件
const exportConfigToFile = async () => {
  try {
    const config = exportConfig();
    const jsonStr = JSON.stringify(config, null, 2);

    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      defaultPath: 'stub_config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (filePath) {
      await writeTextFile(filePath, jsonStr);
      logStore.addMessage(t('stubConfig.exportSuccess'));
    }
  } catch (error) {
    logStore.addMessage(`${t('stubConfig.exportFailed')}: ${error}`, true);
  }
};

// 应用导入的配置
const applyImportedConfig = (config: any) => {
  // pins
  if (Array.isArray(config.pins)) {
    pinConfig.value.enabled = config.pins.length > 0;
    pinConfig.value.items = config.pins
      .map((p: any) => ({
        port: p.port ?? 'PA',
        number: Number(p.number) || 0,
        level: p.level === 'high' ? 'high' : 'low',
      }))
      .slice(0, 12);
  }

  // pmic
  if (config.pmic) {
    pmicConfig.value.enabled = !config.pmic.disabled;
    pmicConfig.value.disabled = !!config.pmic.disabled;
    pmicConfig.value.scl_port = config.pmic.scl_port ?? 'PA';
    pmicConfig.value.scl_pin = Number(config.pmic.scl_pin) || 0;
    pmicConfig.value.sda_port = config.pmic.sda_port ?? 'PA';
    pmicConfig.value.sda_pin = Number(config.pmic.sda_pin) || 1;
    pmicConfig.value.channels = Array.isArray(config.pmic.channels)
      ? config.pmic.channels.filter((c: string) => availablePmicChannels.includes(c))
      : [];
  }

  // sd0
  if (config.sd0) {
    sdioConfig.value.enabled = true;
    sdioConfig.value.base_address = config.sd0.base_address ?? '0x60000000';
    sdioConfig.value.pinmux = config.sd0.pinmux === 'clk_pa60_or_pa39' ? 'clk_pa60_or_pa39' : 'clk_pa34_or_pa09';
    sdioConfig.value.init_sequence = config.sd0.init_sequence === 'sd_then_emmc' ? 'sd_then_emmc' : 'emmc_then_sd';
  }

  // flash
  if (Array.isArray(config.flash)) {
    flashConfig.value.devices = config.flash.slice(0, 12).map((f: any) => ({
      media: f.media === 'nand' ? 'nand' : 'nor',
      driver_index: Number(f.driver_index) || 0,
      manufacturer_id: f.manufacturer_id ?? '0x00',
      device_type: f.device_type ?? '0x00',
      density_id: f.density_id ?? '0x00',
      flags: f.flags ?? '0x00',
      capacity_bytes: f.capacity_bytes ?? '0x1000000',
    }));
  }
};

// 从文件导入
const importConfigFromFile = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });

    if (!filePath) return;

    const content = await readTextFile(filePath as string);
    const parsed = JSON.parse(content);

    applyImportedConfig(parsed);
    logStore.addMessage(t('stubConfig.importSuccess'));
  } catch (error) {
    logStore.addMessage(`${t('stubConfig.importFailed')}: ${error}`, true);
  }
};

// 从本地加载草稿
const loadConfigFromLocal = async () => {
  try {
    const { appDataDir } = await import('@tauri-apps/api/path');
    const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');

    // 获取应用数据目录
    const dataDir = await appDataDir();
    const configPath = `${dataDir}/stub_config/draft.json`;

    // 检查文件是否存在
    const fileExists = await exists(configPath);
    if (!fileExists) {
      return;
    }

    // 读取并应用配置
    const content = await readTextFile(configPath);
    const parsed = JSON.parse(content);
    applyImportedConfig(parsed);
  } catch (error) {
    console.error('Failed to load config draft:', error);
    // 静默失败，不影响用户体验
  }
};

// 组件挂载时初始化
onMounted(async () => {
  logStore.setupEventListeners();
  logStore.initializeLog();

  // 尝试加载本地草稿
  await loadConfigFromLocal();
});

// 监听配置变化，自动保存到Pinia store和本地
watch(
  [currentTab, pinConfig, pmicConfig, sdioConfig, flashConfig],
  () => {
    saveConfigDraft();
    saveConfigToLocal();
  },
  { deep: true }
);
</script>

<style scoped>
/* Tab切换滑动动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
