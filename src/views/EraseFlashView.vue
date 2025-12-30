<template>
  <div class="p-4 h-screen flex flex-col overflow-hidden relative">
    <!-- 页面标题栏 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-base-content">{{ $t('eraseFlash.title') }}</h1>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex flex-col space-y-4 flex-1 min-h-0">
      <!-- 擦除配置区域 -->
      <div class="bg-base-100 rounded-lg shadow-sm border border-base-300 p-6">
        <div class="max-w-md mx-auto">
          <!-- 警告提示 -->
          <div class="alert alert-warning mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 class="font-bold">{{ $t('eraseFlash.warning') }}</h3>
              <div class="text-sm">{{ $t('eraseFlash.warningMessage') }}</div>
            </div>
          </div>

          <!-- 擦除模式选择 -->
          <div class="form-control w-full mb-6">
            <label class="label">
              <span class="label-text font-semibold">{{ $t('eraseFlash.eraseMode') }}</span>
            </label>
            <div class="flex gap-2">
              <button
                class="btn flex-1"
                :class="eraseFlashStore.eraseMode === 'full' ? 'btn-primary' : 'btn-outline'"
                @click="eraseFlashStore.setEraseMode('full')"
                :disabled="eraseFlashStore.isErasing"
              >
                {{ $t('eraseFlash.fullErase') }}
              </button>
              <button
                class="btn flex-1"
                :class="eraseFlashStore.eraseMode === 'region' ? 'btn-primary' : 'btn-outline'"
                @click="eraseFlashStore.setEraseMode('region')"
                :disabled="eraseFlashStore.isErasing"
              >
                {{ $t('eraseFlash.regionErase') }}
              </button>
            </div>
          </div>

          <!-- 擦除地址输入 -->
          <div class="form-control w-full mb-4">
            <label class="label">
              <span class="label-text font-semibold">{{ $t('eraseFlash.address') }}</span>
            </label>
            <input
              type="text"
              v-model="eraseFlashStore.address"
              class="input input-bordered w-full font-mono"
              :class="{ 'input-error': eraseFlashStore.addressError }"
              :placeholder="$t('eraseFlash.addressPlaceholder')"
              @input="validateAddress"
              :disabled="eraseFlashStore.isErasing"
            />
            <label class="label" v-if="eraseFlashStore.addressError">
              <span class="label-text-alt text-error">{{ eraseFlashStore.addressError }}</span>
            </label>
          </div>

          <!-- 擦除大小输入 (仅区域擦除模式) -->
          <div v-if="eraseFlashStore.eraseMode === 'region'" class="form-control w-full mb-6">
            <label class="label">
              <span class="label-text font-semibold">{{ $t('eraseFlash.size') }}</span>
            </label>
            <input
              type="text"
              v-model="eraseFlashStore.size"
              class="input input-bordered w-full font-mono"
              :class="{ 'input-error': eraseFlashStore.sizeError }"
              :placeholder="$t('eraseFlash.sizePlaceholder')"
              @input="validateSize"
              :disabled="eraseFlashStore.isErasing"
            />
            <label class="label" v-if="eraseFlashStore.sizeError">
              <span class="label-text-alt text-error">{{ eraseFlashStore.sizeError }}</span>
            </label>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-center">
            <button
              class="btn btn-error btn-wide gap-2"
              :disabled="!eraseFlashStore.canStartErasing"
              @click="startErasing"
            >
              <span v-if="eraseFlashStore.isErasing" class="loading loading-spinner loading-sm"></span>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span class="font-medium">
                {{ eraseFlashStore.isErasing ? $t('eraseFlash.status.erasing') : $t('eraseFlash.startErase') }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- 状态显示区域 -->
      <div v-if="eraseFlashStore.eraseCompleted" class="bg-base-100 rounded-lg shadow-sm border border-base-300 p-4">
        <div class="flex items-center justify-center gap-3">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-7 w-7 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-green-800">{{ $t('eraseFlash.status.completed') }}</h3>
            <p class="text-sm text-green-600">{{ $t('eraseFlash.completedMessage') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLogStore } from '../stores/logStore';
import { useEraseFlashStore } from '../stores/eraseFlashStore';

const { t } = useI18n();
const logStore = useLogStore();
const eraseFlashStore = useEraseFlashStore();

// 解析带SI单位的大小值
const parseSizeWithUnit = (sizeStr: string): number | null => {
  if (!sizeStr) return null;

  const trimmed = sizeStr.trim().toUpperCase();

  if (trimmed.startsWith('0X')) {
    const value = parseInt(trimmed, 16);
    return isNaN(value) ? null : value;
  }

  const match = trimmed.match(/^([\d.]+)\s*([KMGT]?)(I?B?)?$/i);
  if (!match) {
    const value = parseFloat(trimmed);
    return isNaN(value) ? null : Math.floor(value);
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) return null;

  const unit = match[2].toUpperCase();
  const base = 1024;

  let multiplier = 1;
  switch (unit) {
    case 'K':
      multiplier = base;
      break;
    case 'M':
      multiplier = base * base;
      break;
    case 'G':
      multiplier = base * base * base;
      break;
    case 'T':
      multiplier = base * base * base * base;
      break;
  }

  return Math.floor(value * multiplier);
};

// 组件挂载时初始化
onMounted(() => {
  logStore.setupEventListeners();
  logStore.initializeLog();

  if (!eraseFlashStore.isErasing) {
    eraseFlashStore.resetState();
  }
});

// 验证地址格式
const validateAddress = () => {
  const address = eraseFlashStore.address;

  if (!address) {
    eraseFlashStore.setAddressError(t('eraseFlash.validation.addressRequired'));
    return false;
  }

  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(address)) {
    eraseFlashStore.setAddressError(t('eraseFlash.validation.invalidAddress'));
    return false;
  }

  const addressValue = parseInt(address, 16);
  if (addressValue > 0xffffffff) {
    eraseFlashStore.setAddressError(t('eraseFlash.validation.addressTooLarge'));
    return false;
  }

  eraseFlashStore.setAddressError('');
  return true;
};

// 验证大小
const validateSize = () => {
  const size = eraseFlashStore.size;

  if (!size) {
    eraseFlashStore.setSizeError(t('eraseFlash.validation.sizeRequired'));
    return false;
  }

  const sizeValue = parseSizeWithUnit(size);

  if (sizeValue === null || sizeValue <= 0) {
    eraseFlashStore.setSizeError(t('eraseFlash.validation.invalidSize'));
    return false;
  }

  if (sizeValue > 0xffffffff) {
    eraseFlashStore.setSizeError(t('eraseFlash.validation.sizeTooLarge'));
    return false;
  }

  eraseFlashStore.setSizeError('');
  return true;
};

// 开始擦除
const startErasing = async () => {
  if (!validateAddress()) return;
  if (eraseFlashStore.eraseMode === 'region' && !validateSize()) return;

  eraseFlashStore.setErasingState(true);
  eraseFlashStore.setEraseCompleted(false);

  const modeText = eraseFlashStore.eraseMode === 'full' ? t('eraseFlash.fullErase') : t('eraseFlash.regionErase');

  logStore.addMessage(`${t('eraseFlash.log.startErasing')} (${modeText})`);
  logStore.addMessage(`${t('eraseFlash.address')}: ${eraseFlashStore.address}`);

  if (eraseFlashStore.eraseMode === 'region') {
    logStore.addMessage(`${t('eraseFlash.size')}: ${eraseFlashStore.size}`);
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');

    const addressValue = parseInt(eraseFlashStore.address, 16);

    if (eraseFlashStore.eraseMode === 'full') {
      await invoke('erase_flash', { address: addressValue });
    } else {
      const sizeValue = parseSizeWithUnit(eraseFlashStore.size) || 0;
      await invoke('erase_region', { address: addressValue, size: sizeValue });
    }

    eraseFlashStore.setEraseCompleted(true);
    logStore.addMessage(t('eraseFlash.status.completed'));
  } catch (error) {
    logStore.addMessage(`${t('eraseFlash.status.failed')}: ${error}`, true);
  } finally {
    eraseFlashStore.setErasingState(false);
  }
};
</script>
