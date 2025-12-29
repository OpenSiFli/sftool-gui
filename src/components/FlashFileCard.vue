<template>
  <div 
    class="card card-compact shadow-sm file-list-item border transition-all duration-300 cursor-pointer outline-none ring-offset-2 focus:ring-2 focus:ring-primary/50"
    :class="[getCardClass(), { 'hover:shadow-md': file.collapsed }]"
    tabindex="0"
    @focusout="handleFocusOut"
    @click="setCollapsed(false)"
  >
    <div class="card-body p-2">
      <div class="flex flex-col gap-1">
        <!-- Header: Filename and actions -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 min-w-0 flex items-center gap-2 select-none">
            <div class="font-medium text-sm truncate flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-90': !file.collapsed }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="truncate">{{ file.name }}</span>
              
              <!-- Collapsed info: Address -->
              <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-x-2" enter-to-class="opacity-100 translate-x-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 -translate-x-2">
                <span v-if="file.collapsed" class="flex items-center gap-2 flex-shrink-0">
                  <span v-if="!store.isAutoAddressFile(file.name) && file.address" class="text-xs text-base-content/60 font-mono">
                    @ {{ file.address }}
                  </span>
                  <span v-if="store.isAutoAddressFile(file.name)" class="badge badge-success badge-xs gap-0.5">
                    <span class="text-[10px]">{{ $t('writeFlash.autoAddress') }}</span>
                  </span>
                </span>
              </transition>
            </div>
            
            <!-- Collapsed info: Size -->
            <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div class="text-xs text-base-content/60 flex-shrink-0" v-if="file.collapsed && file.size && file.size > 0">
                {{ formatFileSize(file.size) }}
              </div>
            </transition>
          </div>
          
          <button 
            class="btn btn-xs btn-error btn-ghost hover:bg-error/10 flex-shrink-0"
            @click.stop="removeFile"
            :disabled="store.isFlashing"
            :title="$t('writeFlash.removeFile')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        <!-- Expanded content -->
        <div 
          class="grid transition-[grid-template-rows] duration-300 ease-out"
          :class="file.collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'"
        >
          <div class="overflow-hidden min-h-0">
            <div class="flex flex-col gap-3 ml-6 pt-1">
              <!-- Expanded info: Size -->
              <div class="text-xs text-base-content/60 -mt-1" v-if="file.size && file.size > 0">
                {{ formatFileSize(file.size) }}
              </div>
              
              <!-- Expanded info: Path -->
              <div class="text-xs text-base-content/70 font-mono bg-base-200/50 border border-base-300/50 rounded px-2 py-1.5 truncate select-all" :title="file.path" @click.stop>
                {{ file.path }}
              </div>
              
              <!-- Expanded info: Address input -->
              <div class="flex gap-2 items-center" v-if="!store.isAutoAddressFile(file.name)" @click.stop>
                <span class="text-xs text-base-content/60 flex-shrink-0 w-16 text-right">{{ $t('writeFlash.address') }}:</span>
                <div class="flex-1">
                  <input 
                    type="text" 
                    v-model="file.address"
                    class="input input-xs w-full text-xs font-mono bg-base-100 border-base-300 focus:border-primary focus:bg-base-100 transition-all duration-200 shadow-sm"
                    :class="{ 'border-error bg-error/5': file.addressError }"
                    :placeholder="$t('writeFlash.addressPlaceholder')"
                    @input="validateAddress"
                  />
                </div>
              </div>
              <div v-else class="flex items-center pl-[4.5rem]">
                <div class="badge badge-success badge-sm badge-outline gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ $t('writeFlash.autoAddress') }}
                </div>
              </div>
              
              <!-- Address error -->
              <div v-if="file.addressError && !store.isAutoAddressFile(file.name)" class="text-xs text-error flex items-center gap-1 pl-[4.5rem]">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ file.addressError }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWriteFlashStore } from '../stores/writeFlashStore';
import { useI18n } from 'vue-i18n';
import type { FlashFile } from '../types/progress';

const props = defineProps<{
  file: FlashFile;
  index: number;
}>();

const store = useWriteFlashStore();
const { t } = useI18n();

const setCollapsed = (collapsed: boolean) => {
  store.setFileCollapsed(props.index, collapsed);
};

const handleFocusOut = (event: FocusEvent) => {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;
  
  // 如果焦点移动到组件内部的元素（如输入框），不折叠
  if (currentTarget.contains(relatedTarget)) {
    return;
  }
  
  // 焦点移出组件，折叠
  setCollapsed(true);
};

const removeFile = () => {
  store.removeFile(props.index);
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getCardClass = () => {
  const fileName = props.file.name;
  
  if (store.currentFlashingFile === fileName) {
    return 'downloading-file';
  }
  
  if (store.completedFiles.has(fileName)) {
    return 'bg-green-50/10 border-green-400/30 hover:shadow-md transition-all duration-300';
  }
  
  return 'bg-base-200/30 border-base-300/40 hover:shadow-md transition-all duration-300';
};

const validateAddress = () => {
  const file = props.file;
  const index = props.index;
  
  if (!file.address) {
    store.updateFileAddressError(index, t('writeFlash.validation.addressRequired'));
    return false;
  }
  
  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(file.address)) {
    store.updateFileAddressError(index, t('writeFlash.validation.invalidAddress'));
    return false;
  }
  
  const addressValue = parseInt(file.address, 16);
  if (addressValue > 0xFFFFFFFF) {
    store.updateFileAddressError(index, t('writeFlash.validation.addressTooLarge'));
    return false;
  }
  
  const duplicateIndex = store.selectedFiles.findIndex((f, i) => 
    i !== index && f.address === file.address && f.address
  );
  if (duplicateIndex !== -1) {
    store.updateFileAddressError(index, t('writeFlash.validation.duplicateAddress'));
    return false;
  }
  
  store.updateFileAddressError(index, '');
  return true;
};
</script>
