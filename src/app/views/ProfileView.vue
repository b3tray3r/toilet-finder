<template>
  <div class="profile-view">
    <header class="profile-header">
      <RouterLink to="/" class="back-btn">←</RouterLink>
      <h1 class="profile-header__title">Профиль</h1>
    </header>

    <div class="profile-content">
      <!-- Аватар и имя -->
      <div class="profile-hero">
        <div class="profile-hero__avatar">{{ initials }}</div>
        <div>
          <h2 class="profile-hero__name">{{ profile?.nickname || 'Пользователь' }}</h2>
          <p class="profile-hero__email">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <!-- Очки -->
      <div class="stat-card">
        <span class="stat-card__icon">⭐</span>
        <div>
          <p class="stat-card__value">{{ profile?.points || 0 }}</p>
          <p class="stat-card__label">Очков репутации</p>
        </div>
      </div>

      <!-- Подписка -->
      <div class="section">
        <h3 class="section__title">💎 Подписка</h3>
        <div class="subscription-card" :class="{ active: profile?.is_subscribed }">
          <div class="subscription-card__info">
            <p class="subscription-card__status">
              {{ profile?.is_subscribed ? '✓ Активна — без рекламы' : 'Реклама включена' }}
            </p>
            <p class="subscription-card__desc">
              {{ profile?.is_subscribed ? 'Спасибо за поддержку!' : 'Подпишитесь, чтобы убрать рекламу' }}
            </p>
          </div>
          <button
            class="toggle-btn"
            :class="{ active: profile?.is_subscribed }"
            @click="authStore.toggleSubscription()"
          >
            {{ profile?.is_subscribed ? 'Отключить' : 'Активировать' }}
          </button>
        </div>
        <p class="section__note">* Mock-переключатель для MVP. В продакшн будет реальная оплата.</p>
      </div>

      <!-- Действия -->
      <div class="section">
        <h3 class="section__title">Настройки</h3>
        <button class="action-btn action-btn--danger" @click="logout">
          🚪 Выйти из аккаунта
        </button>
      </div>
    </div>

    <!-- Нижняя навигация -->
    <nav class="bottom-nav">
      <RouterLink to="/" class="bottom-nav__item">
        <span>🗺</span><small>Карта</small>
      </RouterLink>
      <RouterLink to="/profile" class="bottom-nav__item bottom-nav__item--active">
        <span>👤</span><small>Профиль</small>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/store'

const authStore = useAuthStore()
const router = useRouter()

const profile = computed(() => authStore.profile)
const initials = computed(() => {
  const name = profile.value?.nickname || authStore.user?.email || 'U'
  return name.slice(0, 2).toUpperCase()
})

async function logout() {
  await authStore.signOut()
  router.push('/')
}
</script>

<style scoped>
.profile-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
  flex-shrink: 0;
}

.back-btn {
  color: var(--accent);
  text-decoration: none;
  font-size: 20px;
  font-family: 'Inter', sans-serif;
}

.profile-header__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 16px;
  font-weight: 700;
}

.profile-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: calc(var(--bottom-nav-height) + 20px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Герой */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.profile-hero__avatar {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: var(--accent);
  color: white;
  font-family: 'Unbounded', sans-serif;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-hero__name {
  font-family: 'Unbounded', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-hero__email {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Статистика */
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.stat-card__icon { font-size: 32px; }
.stat-card__value { font-family: 'Unbounded', sans-serif; font-size: 28px; font-weight: 700; color: var(--warning); }
.stat-card__label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

/* Секции */
.section { display: flex; flex-direction: column; gap: 10px; }

.section__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.section__note {
  font-size: 11px;
  color: var(--text-muted);
}

/* Подписка */
.subscription-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.2s;
}

.subscription-card.active { border-color: var(--accent); }

.subscription-card__status {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.subscription-card__desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.toggle-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}

.toggle-btn.active {
  border-color: var(--accent);
  color: var(--accent);
}

/* Кнопки действий */
.action-btn {
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  text-align: left;
  transition: all 0.2s;
}

.action-btn--danger { color: var(--error); border-color: rgba(248, 113, 113, 0.3); }
.action-btn--danger:hover { background: rgba(248, 113, 113, 0.1); }

/* Нижняя навигация */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: var(--bottom-nav-height);
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 100;
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
}

.bottom-nav__item--active,
.bottom-nav__item.router-link-active { color: var(--accent); }
</style>
