import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type EraseMode = 'full' | 'region';

export const useEraseFlashStore = defineStore('eraseFlash', () => {
  // 基本状态
  const eraseMode = ref<EraseMode>('full');
  const address = ref<string>('0x10000000');
  const size = ref<string>('');
  const addressError = ref<string>('');
  const sizeError = ref<string>('');
  const isErasing = ref(false);
  const eraseCompleted = ref(false);

  // 计算属性
  const canStartErasing = computed(() => {
    if (isErasing.value) return false;
    if (!address.value || addressError.value) return false;
    if (eraseMode.value === 'region' && (!size.value || sizeError.value)) return false;
    return true;
  });

  // Actions
  const setEraseMode = (mode: EraseMode) => {
    eraseMode.value = mode;
    // 切换模式时清除错误
    sizeError.value = '';
  };

  const setAddress = (newAddress: string) => {
    address.value = newAddress;
  };

  const setSize = (newSize: string) => {
    size.value = newSize;
  };

  const setAddressError = (error: string) => {
    addressError.value = error;
  };

  const setSizeError = (error: string) => {
    sizeError.value = error;
  };

  const setErasingState = (erasing: boolean) => {
    isErasing.value = erasing;
  };

  const setEraseCompleted = (completed: boolean) => {
    eraseCompleted.value = completed;
  };

  const resetState = () => {
    eraseCompleted.value = false;
  };

  return {
    // 状态
    eraseMode,
    address,
    size,
    addressError,
    sizeError,
    isErasing,
    eraseCompleted,

    // 计算属性
    canStartErasing,

    // Actions
    setEraseMode,
    setAddress,
    setSize,
    setAddressError,
    setSizeError,
    setErasingState,
    setEraseCompleted,
    resetState,
  };
});
