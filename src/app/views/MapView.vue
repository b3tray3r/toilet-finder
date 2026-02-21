<template>
  <div class="map-view">
    <!-- Карта -->
    <div id="map" class="map-view__map"></div>

    <!-- Топбар -->
    <header class="map-view__header">
      <div class="header-brand">
        <span class="header-brand__icon">🚾</span>
        <span class="header-brand__title">Найди туалет</span>
        <span class="header-brand__city">{{ cityLabel }}</span>
      </div>
    </header>

    <!-- Рекламный баннер -->
    <div v-if="!authStore.isSubscribed" id="ad-banner" class="map-view__ad"></div>

    <!-- Кнопки справа: геолокация + FAB -->
    <div class="map-controls">
      <button class="map-controls__geo" @click="centerOnUser" title="Моя геолокация">📍</button>
      <button
        class="fab"
        :class="{ 'fab--active': addMode }"
        @click="toggleAddMode"
        :title="addMode ? 'Отмена' : 'Добавить туалет'"
      >
        {{ addMode ? '✕' : '+' }}
      </button>
    </div>

    <!-- Подсказка режима добавления -->
    <Transition name="fade">
      <div v-if="addMode" class="map-hint">
        📌 Нажмите на карту, чтобы выбрать место
      </div>
    </Transition>

    <!-- Нижняя навигация -->
    <nav class="bottom-nav">
      <RouterLink :to="`/toilets/${city}`" class="bottom-nav__item bottom-nav__item--active">
        <span>🗺</span><small>Карта</small>
      </RouterLink>
      <RouterLink to="/profile" class="bottom-nav__item">
        <span>👤</span><small>Профиль</small>
      </RouterLink>
    </nav>

    <!-- Модалка добавления -->
    <Transition name="slide-up">
      <AddToiletModal
        v-if="showAddModal"
        :lat="selectedLat"
        :lng="selectedLng"
        :city="city"
        @close="closeAddModal"
        @added="onToiletAdded"
      />
    </Transition>

    <!-- Модалка жалобы -->
    <Transition name="slide-up">
      <ReportModal
        v-if="reportToiletId"
        :toilet-id="reportToiletId"
        @close="reportToiletId = null"
      />
    </Transition>

    <!-- Интерстициальная реклама (mock) -->
    <Transition name="fade">
      <div v-if="showInterstitial" class="interstitial" @click="showInterstitial = false">
        <div class="interstitial__box">
          <p>📢 Место для рекламы (Яндекс)</p>
          <button @click="showInterstitial = false">Закрыть</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'
import { MapService } from '@/modules/map/MapService'
import { useToiletsStore } from '@/modules/toilets/store'
import { useAuthStore } from '@/modules/auth/store'
import { adsService } from '@/shared/services/ads'
import AddToiletModal from '@/modules/toilets/AddToiletModal.vue'
import ReportModal from '@/modules/toilets/ReportModal.vue'

const route = useRoute()
const toiletsStore = useToiletsStore()
const authStore = useAuthStore()

const city = computed(() => route.params.city || 'moscow')
const cityNames = { moscow: 'Москва', spb: 'Санкт-Петербург' }
const cityLabel = computed(() => cityNames[city.value] ?? city.value)

const mapService = new MapService()
const addMode = ref(false)
const selectedLat = ref(null)
const selectedLng = ref(null)
const showAddModal = ref(false)
const reportToiletId = ref(null)
const showInterstitial = ref(false)

function buildPopup(toilet) {
  const voted = toiletsStore.userVotes.has(toilet.id)
  const canVote = authStore.isAuthenticated && !voted
  return `
    <div class="toilet-popup">
      <h3 class="toilet-popup__name">${toilet.name}</h3>
      <p class="toilet-popup__desc">${toilet.description || ''}</p>
      <div class="toilet-popup__meta">
        <span>${toilet.is_paid ? '💰 Платный' : '✅ Бесплатный'}</span>
        <span>👍 ${toilet.votes} голосов</span>
        <span class="status-badge status-badge--${toilet.status}">${toilet.status === 'confirmed' ? '⭐ Подтверждён' : '⏳ На проверке'}</span>
      </div>
      <div class="toilet-popup__actions">
        ${canVote ? `<button class="popup-btn popup-btn--vote" data-id="${toilet.id}">👍 Голосовать</button>` : ''}
        ${voted ? '<span class="voted-label">✓ Вы проголосовали</span>' : ''}
        <button class="popup-btn popup-btn--report" data-id="${toilet.id}">🚩 Жалоба</button>
      </div>
    </div>
  `
}

function handlePopupAction(e) {
  const voteBtn = e.target.closest('[data-id].popup-btn--vote')
  const reportBtn = e.target.closest('[data-id].popup-btn--report')
  if (voteBtn) handleVote(voteBtn.dataset.id)
  if (reportBtn) reportToiletId.value = reportBtn.dataset.id
}

async function handleVote(toiletId) {
  if (!authStore.isAuthenticated) return alert('Войдите, чтобы голосовать')
  try {
    await toiletsStore.vote(toiletId, authStore.user.id)
    // Обновить конкретный маркер с актуальными данными
    const updatedToilet = toiletsStore.toilets.find(t => t.id === toiletId)
    if (updatedToilet) {
      mapService.refreshMarker(toiletId, updatedToilet, buildPopup)
    }
  } catch (e) {
    alert(e.message)
  }
}

async function loadToilets() {
  await toiletsStore.fetchInBounds(mapService.getBounds(), city.value)
  mapService.syncMarkers(toiletsStore.toilets, buildPopup)
}

function toggleAddMode() {
  if (!authStore.isAuthenticated) {
    alert('Войдите, чтобы добавить туалет')
    return
  }
  addMode.value = !addMode.value
  if (!addMode.value) mapService.removeTempMarker()
}

function closeAddModal() {
  showAddModal.value = false
  addMode.value = false
  mapService.removeTempMarker()
}

async function onToiletAdded() {
  closeAddModal()
  await loadToilets()
  if (!authStore.isSubscribed) {
    showInterstitial.value = true
  }
}

async function centerOnUser() {
  console.log('Запрашиваем геолокацию...')
  const success = await mapService.centerOnUser()
  console.log('Геолокация результат:', success)
  if (success) await loadToilets()
}

onMounted(async () => {
  mapService.init(
    'map',
    // onClick
    (lat, lng) => {
      if (!addMode.value) return
      selectedLat.value = lat
      selectedLng.value = lng
      mapService.setTempMarker(lat, lng)
      showAddModal.value = true
    },
    // onMove (debounced)
    () => loadToilets()
  )

  await mapService.centerOnUser()
  await loadToilets()

  if (authStore.isAuthenticated) {
    await toiletsStore.loadUserVotes(authStore.user.id)
  }

  adsService.showBanner('ad-banner', authStore.isSubscribed)

  // Делегирование событий для popup кнопок
  document.addEventListener('click', handlePopupAction)

  // Интерстициальная реклама через event
  window.addEventListener('show-interstitial-ad', () => {
    showInterstitial.value = true
  })
})

// Следим за городом в URL
watch(city, () => loadToilets())

onBeforeUnmount(() => {
  mapService.destroy()
  document.removeEventListener('click', handlePopupAction)
})
</script>

<style scoped>
.map-view {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.map-view__map {
  width: 100%;
  height: 100%;
}

.map-view__header {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(to bottom, rgba(13,13,26,0.95) 0%, transparent 100%);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-brand__icon { font-size: 22px; }

.header-brand__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-brand__city {
  background: var(--accent);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Кнопки управления справа */
.map-controls {
  position: absolute;
  right: 20px;
  bottom: calc(var(--bottom-nav-height) + 20px);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.map-controls__geo {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  transition: background 0.2s;
}

.map-controls__geo:hover { background: var(--bg-elevated); }

/* Реклама */
.map-view__ad {
  position: absolute;
  bottom: var(--bottom-nav-height);
  left: 0; right: 0;
  z-index: 1000;
}

/* FAB */
.fab {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--accent);
  color: white;
  font-size: 28px;
  line-height: 1;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(108, 99, 255, 0.5);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab:hover { background: var(--accent-hover); transform: scale(1.05); }
.fab--active { background: var(--error); box-shadow: 0 4px 20px rgba(248, 113, 113, 0.5); }

/* Подсказка */
.map-hint {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 10px 16px;
  border-radius: 24px;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  box-shadow: var(--shadow);
}

/* Нижняя навигация */
.bottom-nav {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: var(--bottom-nav-height);
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 1000;
}

.bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 22px;
  transition: color 0.2s;
}

.bottom-nav__item small {
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.5px;
}

.bottom-nav__item--active,
.bottom-nav__item.router-link-active {
  color: var(--accent);
}

/* Интерстициальная реклама */
.interstitial {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.interstitial__box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 320px;
  width: 90%;
}

.interstitial__box button {
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
}
</style>

<style>
/* Глобальные стили для popup (не scoped) */
.toilet-popup {
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
  min-width: 220px;
}

.toilet-popup__name {
  font-family: 'Unbounded', sans-serif;
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.toilet-popup__desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.5;
}

.toilet-popup__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
}

.status-badge--confirmed { background: rgba(74, 222, 128, 0.15); color: var(--success); }
.status-badge--pending { background: rgba(250, 204, 21, 0.15); color: var(--warning); }

.toilet-popup__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.popup-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  transition: background 0.2s;
}

.popup-btn--vote { background: rgba(108, 99, 255, 0.2); color: var(--accent); }
.popup-btn--vote:hover { background: rgba(108, 99, 255, 0.35); }
.popup-btn--report { background: rgba(248, 113, 113, 0.15); color: var(--error); }
.popup-btn--report:hover { background: rgba(248, 113, 113, 0.3); }

.voted-label { font-size: 12px; color: var(--success); }
</style>