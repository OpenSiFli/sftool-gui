<template>
  <div
    class="card card-compact shadow-sm file-list-item border transition-all duration-300 cursor-pointer outline-none focus:border-primary/50"
    :class="[getCardClass(), { 'hover:shadow-md': task.collapsed }]"
    tabindex="0"
    @focusout="handleFocusOut"
    @click="setCollapsed(false)"
  >
    <div class="card-body py-1 px-2">
      <div class="flex flex-col gap-1">
        <!-- Header: Task Info and Remove Button -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 min-w-0 flex items-center gap-2 select-none">
            <div class="font-medium text-sm truncate flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-primary flex-shrink-0 transition-transform duration-300"
                :class="{ 'rotate-90': !task.collapsed }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="truncate">{{ $t('readFlash.task') }} {{ index + 1 }}</span>

              <!-- Collapsed Info: Address and Size -->
              <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-x-2"
                enter-to-class="opacity-100 translate-x-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-x-0"
                leave-to-class="opacity-0 -translate-x-2"
              >
                <span v-if="task.collapsed" class="flex items-center gap-2 flex-shrink-0">
                  <span class="text-xs text-base-content/60 font-mono" v-if="task.address">@ {{ task.address }}</span>
                  <span class="text-xs text-base-content/60" v-if="task.size">({{ task.size }})</span>
                </span>
              </transition>
            </div>

            <!-- Collapsed Info: Filename -->
            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                class="text-xs text-base-content/60 flex-shrink-0 truncate max-w-[150px]"
                v-if="task.collapsed && task.filePath"
              >
                {{ getFileName(task.filePath) }}
              </div>
            </transition>
          </div>

          <button
            class="btn btn-xs btn-error btn-ghost hover:bg-error/10 flex-shrink-0"
            @click.stop="removeTask"
            :disabled="store.isReading"
            :title="$t('readFlash.removeTask')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
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
          </button>
        </div>

        <!-- Expanded Content -->
        <div
          class="grid transition-[grid-template-rows] duration-300 ease-out"
          :class="task.collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'"
        >
          <div class="overflow-hidden min-h-0">
            <div class="flex flex-col gap-3 ml-6 pt-1 pb-2">
              <!-- Save Path -->
              <div class="flex gap-2 items-center" @click.stop>
                <span class="text-xs text-base-content/60 flex-shrink-0 w-20 text-right"
                  >{{ $t('readFlash.filePath') }}:</span
                >
                <div class="flex-1 flex gap-2">
                  <input
                    type="text"
                    :value="task.filePath"
                    class="input input-xs flex-1 text-xs font-mono bg-base-200/50 border-base-300/40 focus:border-primary/50 focus:bg-base-100 transition-all duration-200"
                    :placeholder="$t('readFlash.filePathPlaceholder')"
                    readonly
                  />
                  <button class="btn btn-xs btn-outline" @click="handleSelectSavePath" :disabled="store.isReading">
                    {{ $t('readFlash.selectSavePath') }}
                  </button>
                </div>
              </div>

              <!-- Start Address -->
              <div class="flex gap-2 items-center" @click.stop>
                <span class="text-xs text-base-content/60 flex-shrink-0 w-20 text-right"
                  >{{ $t('readFlash.address') }}:</span
                >
                <div class="flex-1">
                  <input
                    v-model="addressModel"
                    type="text"
                    class="input input-xs w-full text-xs font-mono bg-base-100 border-base-300 focus:border-primary focus:bg-base-100 transition-all duration-200 shadow-sm"
                    :class="{ 'border-error bg-error/5': task.addressError }"
                    :placeholder="$t('readFlash.addressPlaceholder')"
                    @input="validateAddress"
                  />
                </div>
              </div>

              <!-- Address Error -->
              <div v-if="task.addressError" class="text-xs text-error flex items-center gap-1 ml-[5.5rem] -mt-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{ task.addressError }}
              </div>

              <!-- Read Size -->
              <div class="flex gap-2 items-center" @click.stop>
                <span class="text-xs text-base-content/60 flex-shrink-0 w-20 text-right"
                  >{{ $t('readFlash.size') }}:</span
                >
                <div class="flex-1">
                  <input
                    v-model="sizeModel"
                    type="text"
                    class="input input-xs w-full text-xs font-mono bg-base-100 border-base-300 focus:border-primary focus:bg-base-100 transition-all duration-200 shadow-sm"
                    :class="{ 'border-error bg-error/5': task.sizeError }"
                    :placeholder="$t('readFlash.sizePlaceholder')"
                    @input="validateSize"
                  />
                </div>
              </div>

              <!-- Size Error -->
              <div v-if="task.sizeError" class="text-xs text-error flex items-center gap-1 ml-[5.5rem] -mt-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{ task.sizeError }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useReadFlashStore, type ReadFlashTask } from '../stores/readFlashStore';
import { useI18n } from 'vue-i18n';
import { useLogStore } from '../stores/logStore';

const props = defineProps<{
  task: ReadFlashTask;
  index: number;
}>();

const store = useReadFlashStore();
const logStore = useLogStore();
const { t } = useI18n();

const addressModel = computed({
  get: () => props.task.address,
  set: (value: string) => {
    store.updateTaskAddress(props.index, value);
  },
});

const sizeModel = computed({
  get: () => props.task.size,
  set: (value: string) => {
    store.updateTaskSize(props.index, value);
  },
});

const setCollapsed = (collapsed: boolean) => {
  store.setTaskCollapsed(props.index, collapsed);
};

const handleFocusOut = (event: FocusEvent) => {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;

  if (currentTarget.contains(relatedTarget)) {
    return;
  }

  setCollapsed(true);
};

const removeTask = () => {
  store.removeTask(props.index);
  logStore.addMessage(t('readFlash.log.taskRemoved'));
};

const getFileName = (path: string) => {
  if (!path) return '';
  return path.split('/').pop() || path.split('\\').pop() || '';
};

const getCardClass = () => {
  if (store.currentReadingTaskId === props.task.id && store.isReading) {
    return 'downloading-file';
  }

  if (store.completedTasks.has(props.task.id)) {
    return 'bg-green-50/10 border-green-400/30 hover:shadow-md transition-all duration-300';
  }

  return 'bg-base-200/30 border-base-300/40 hover:shadow-md transition-all duration-300';
};

const handleSelectSavePath = async () => {
  if (store.isReading) return;

  try {
    const { save } = await import('@tauri-apps/plugin-dialog');

    const filePath = await save({
      filters: [
        {
          name: 'Binary Files',
          extensions: ['bin'],
        },
      ],
      defaultPath: 'firmware.bin',
    });

    if (filePath) {
      store.updateTaskFilePath(props.index, filePath);
      logStore.addMessage(`${t('readFlash.log.savePathSelected')}: ${filePath}`);
    }
  } catch (error) {
    logStore.addMessage(`${t('readFlash.status.failed')}: ${error}`, true);
  }
};

// Validation Logic (moved from View)
const validateAddress = () => {
  const task = props.task;
  const index = props.index;

  if (!task.address) {
    store.updateTaskAddressError(index, t('readFlash.validation.addressRequired'));
    return false;
  }

  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(task.address)) {
    store.updateTaskAddressError(index, t('readFlash.validation.invalidAddress'));
    return false;
  }

  const addressValue = parseInt(task.address, 16);
  if (addressValue > 0xffffffff) {
    store.updateTaskAddressError(index, t('readFlash.validation.addressTooLarge'));
    return false;
  }

  store.updateTaskAddressError(index, '');
  store.saveTasksToStorage();
  return true;
};

// Parse Size Helper
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
  const isBinary = match[3]?.toUpperCase().startsWith('I');
  const base = isBinary ? 1024 : 1024;
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
    default:
      multiplier = 1;
  }
  return Math.floor(value * multiplier);
};

const validateSize = () => {
  const task = props.task;
  const index = props.index;

  if (!task.size) {
    store.updateTaskSizeError(index, t('readFlash.validation.sizeRequired'));
    return false;
  }

  const sizeValue = parseSizeWithUnit(task.size);

  if (sizeValue === null || sizeValue <= 0) {
    store.updateTaskSizeError(index, t('readFlash.validation.invalidSize'));
    return false;
  }

  if (sizeValue > 0xffffffff) {
    store.updateTaskSizeError(index, t('readFlash.validation.sizeTooLarge'));
    return false;
  }

  store.updateTaskSizeError(index, '');
  store.saveTasksToStorage();
  return true;
};
</script>
