<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">{{ $t('writeFlash.title') }}</h1>
    
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="form-control w-full max-w-md">
          <label class="label">
            <span class="label-text">选择固件文件 / Select Firmware File</span>
          </label>
          <div class="flex gap-2">
            <input type="text" v-model="selectedFile" readonly placeholder="未选择文件..." class="input input-bordered flex-grow" />
            <button class="btn" @click="handleSelectFile">{{ $t('writeFlash.selectFile') }}</button>
          </div>
          <div class="mt-2 text-sm text-gray-500" v-if="selectedFile">
            {{ selectedFile }}
          </div>
        </div>
        
        <div class="mt-8">
          <div class="flex justify-between mb-2">
            <span>{{ $t('writeFlash.progress') }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
          <progress class="progress progress-primary w-full" :value="progressPercent" max="100"></progress>
        </div>
        
        <div class="mt-6 bg-base-200 p-4 rounded-lg h-32 overflow-auto font-mono text-sm">
          <pre>{{ logMessages.join('\n') }}</pre>
        </div>
        
        <div class="card-actions justify-end mt-6">
          <button class="btn btn-outline" :disabled="isFlashing || !selectedFile">清除日志 / Clear Log</button>
          <button 
            class="btn btn-primary" 
            :disabled="isFlashing || !selectedFile" 
            @click="startFlashing"
          >
            <span v-if="isFlashing" class="loading loading-spinner loading-sm mr-2"></span>
            {{ $t('writeFlash.startFlash') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 状态管理
const selectedFile = ref('');
const progressPercent = ref(0);
const isFlashing = ref(false);
const logMessages = ref([
  '系统就绪，请选择固件文件...',
  'System ready, please select firmware file...'
]);

// 处理选择文件
const handleSelectFile = () => {
  // 实际项目中，这里应该调用Tauri API来选择文件
  selectedFile.value = 'firmware.bin';
  logMessages.value.push('已选择文件: ' + selectedFile.value);
  logMessages.value.push('File selected: ' + selectedFile.value);
};

// 开始烧录
const startFlashing = () => {
  if (!selectedFile.value) return;
  
  isFlashing.value = true;
  progressPercent.value = 0;
  logMessages.value.push('开始烧录...');
  logMessages.value.push('Starting flash process...');
  
  // 模拟烧录过程
  const interval = setInterval(() => {
    progressPercent.value += 10;
    logMessages.value.push(`烧录进度: ${progressPercent.value}%`);
    
    if (progressPercent.value >= 100) {
      clearInterval(interval);
      isFlashing.value = false;
      logMessages.value.push('烧录完成！');
      logMessages.value.push('Flash completed!');
    }
  }, 1000);
};
</script>