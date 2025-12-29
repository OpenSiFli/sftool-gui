import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useEraseFlashStore = defineStore('eraseFlash', () => {
    // 基本状态
    const address = ref<string>('0x10000000');
    const addressError = ref<string>('');
    const isErasing = ref(false);
    const eraseCompleted = ref(false);

    // 计算属性
    const canStartErasing = computed(() => {
        return address.value && !addressError.value && !isErasing.value;
    });

    // Actions
    const setAddress = (newAddress: string) => {
        address.value = newAddress;
    };

    const setAddressError = (error: string) => {
        addressError.value = error;
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
        address,
        addressError,
        isErasing,
        eraseCompleted,

        // 计算属性
        canStartErasing,

        // Actions
        setAddress,
        setAddressError,
        setErasingState,
        setEraseCompleted,
        resetState
    };
});
