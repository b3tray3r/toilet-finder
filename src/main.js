import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './app/router'
import { useAuthStore } from './modules/auth/store'
import { adsService } from './shared/services/ads'
import App from './App.vue'
import './app/styles/global.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // Инициализировать auth до монтирования
  const authStore = useAuthStore()
  await authStore.init()

  // Инициализировать рекламу
  adsService.init()

  app.mount('#app')
}

bootstrap()
