<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">{{ $t('settings.title') }}</h1>
    
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <h2 class="card-title">{{ $t('settings.general') }}</h2>
        
        <div class="form-control w-full max-w-xs mt-4">
          <label class="label">
            <span class="label-text">语言 / Language</span>
          </label>
          <select class="select select-bordered">
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div class="form-control w-full max-w-xs mt-4">
          <label class="label">
            <span class="label-text">主题 / Theme</span>
          </label>
          <select class="select select-bordered">
            <option value="light">默认亮色 / Light</option>
            <option value="dark">暗色 / Dark</option>
            <option value="system">跟随系统 / System</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="card bg-base-100 shadow-lg mt-6">
      <div class="card-body">
        <h2 class="card-title">{{ $t('settings.advanced') }}</h2>
        
        <div class="form-control w-full max-w-xs mt-4">
          <label class="label">
            <span class="label-text">端口 / Port</span>
          </label>
          <select class="select select-bordered">
            <option value="COM1">COM1</option>
            <option value="COM2">COM2</option>
            <option value="COM3">COM3</option>
            <option value="COM4">COM4</option>
          </select>
        </div>
        
        <div class="form-control w-full max-w-xs mt-4">
          <label class="label">
            <span class="label-text">波特率 / Baud Rate</span>
          </label>
          <select class="select select-bordered">
            <option value="9600">9600</option>
            <option value="19200">19200</option>
            <option value="38400">38400</option>
            <option value="57600">57600</option>
            <option value="115200">115200</option>
          </select>
        </div>
        
        <div class="form-control mt-4">
          <label class="cursor-pointer label">
            <span class="label-text">调试模式 / Debug Mode</span>
            <input type="checkbox" class="toggle toggle-primary" />
          </label>
        </div>
      </div>
    </div>
    
    <div class="flex justify-end mt-6">
      <button class="btn btn-primary">保存 / Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 设置页面组件逻辑
</script>