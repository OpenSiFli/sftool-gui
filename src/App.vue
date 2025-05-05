<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// 不再直接引入MainLayout，而是通过路由加载
</script>

<style>
.app {
  height: 100vh;
  width: 100vw;
}
</style>