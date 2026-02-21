<template>
  <RouterView v-if="!authStore.loading" v-slot="{ Component }">
    <KeepAlive include="MapView">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <div v-else class="app-loading">
    <div class="app-loading__spinner"></div>
    <p>Загрузка...</p>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/modules/auth/store'

const authStore = useAuthStore()
</script>

<style scoped>
.app-loading {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
  font-family: 'Unbounded', sans-serif;
}

.app-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>