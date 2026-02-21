<template>
  <!-- Android/Desktop: стандартный промпт -->
  <Transition name="slide-up">
    <div v-if="showAndroidPrompt" class="pwa-prompt">
      <div class="pwa-prompt__icon">🚾</div>
      <div class="pwa-prompt__text">
        <p class="pwa-prompt__title">Установить приложение</p>
        <p class="pwa-prompt__sub">Работает без интернета, занимает мало места</p>
      </div>
      <div class="pwa-prompt__actions">
        <button class="pwa-prompt__btn pwa-prompt__btn--skip" @click="dismiss">Позже</button>
        <button class="pwa-prompt__btn pwa-prompt__btn--install" @click="install">Установить</button>
      </div>
    </div>
  </Transition>

  <!-- iOS Safari: инструкция -->
  <Transition name="slide-up">
    <div v-if="showIosPrompt" class="pwa-prompt pwa-prompt--ios">
      <button class="pwa-prompt__close" @click="dismiss">✕</button>
      <div class="pwa-prompt__icon">🚾</div>
      <p class="pwa-prompt__title">Установить на iPhone</p>
      <p class="pwa-prompt__sub">
        Нажмите <span class="pwa-prompt__share">⬆</span> «Поделиться»
        и выберите «На экран "Домой"»
      </p>
      <div class="pwa-prompt__arrow"></div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showAndroidPrompt = ref(false)
const showIosPrompt = ref(false)
let deferredPrompt = null

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

function isDismissed() {
  return localStorage.getItem('pwa-prompt-dismissed') === 'true'
}

function dismiss() {
  showAndroidPrompt.value = false
  showIosPrompt.value = false
  localStorage.setItem('pwa-prompt-dismissed', 'true')
}

async function install() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    showAndroidPrompt.value = false
  }
  deferredPrompt = null
}

onMounted(() => {
  if (isInStandaloneMode() || isDismissed()) return

  // Android / Desktop Chrome
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    // Показать через 3 секунды чтобы не пугать сразу
    setTimeout(() => { showAndroidPrompt.value = true }, 3000)
  })

  // iOS Safari
  if (isIos()) {
    setTimeout(() => { showIosPrompt.value = true }, 3000)
  }
})
</script>

<style scoped>
.pwa-prompt {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 12px);
  left: 12px;
  right: 12px;
  z-index: 2000;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow);
}

.pwa-prompt--ios {
  flex-direction: column;
  text-align: center;
  padding-bottom: 24px;
}

.pwa-prompt__close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
}

.pwa-prompt__icon {
  font-size: 32px;
  flex-shrink: 0;
}

.pwa-prompt__text {
  flex: 1;
}

.pwa-prompt__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.pwa-prompt__sub {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.pwa-prompt__share {
  display: inline-block;
  background: var(--accent);
  color: white;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
}

.pwa-prompt__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.pwa-prompt__btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
}

.pwa-prompt__btn--skip {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.pwa-prompt__btn--install {
  background: var(--accent);
  color: white;
}

/* Стрелка вниз для iOS */
.pwa-prompt__arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid var(--bg-card);
}
</style>