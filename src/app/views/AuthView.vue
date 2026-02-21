<template>
  <div class="auth-view">
    <div class="auth-card">
      <div class="auth-card__logo">🚾</div>
      <h1 class="auth-card__title">Найди туалет</h1>
      <p class="auth-card__sub">Войдите, чтобы добавлять точки и голосовать</p>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'login' }" @click="tab = 'login'">Вход</button>
        <button class="tab" :class="{ active: tab === 'register' }" @click="tab = 'register'">Регистрация</button>
      </div>

      <form @submit.prevent="submit" class="auth-form">
        <div class="field">
          <label class="field__label">Email</label>
          <input v-model="email" type="email" class="field__input" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="field">
          <label class="field__label">Пароль</label>
          <input v-model="password" type="password" class="field__input" placeholder="Минимум 6 символов" required autocomplete="current-password" minlength="6" />
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <p v-if="successMsg" class="auth-success">{{ successMsg }}</p>

        <button type="submit" class="btn btn--primary" :disabled="loading">
          {{ loading ? '...' : (tab === 'login' ? 'Войти' : 'Зарегистрироваться') }}
        </button>
      </form>

      <div class="divider"><span>или</span></div>

      <button class="btn btn--google" @click="loginGoogle" :disabled="loading">
        <span class="google-icon">G</span> Войти через Google
      </button>

      <RouterLink to="/" class="back-link">← Назад к карте</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth/store'

const router = useRouter()
const authStore = useAuthStore()

const tab = ref('login')
const email = ref('')
const password = ref('')
const error = ref('')
const successMsg = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  successMsg.value = ''
  loading.value = true
  try {
    if (tab.value === 'login') {
      await authStore.signIn(email.value, password.value)
      router.push('/')
    } else {
      await authStore.signUp(email.value, password.value)
      successMsg.value = 'Проверьте email для подтверждения аккаунта!'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loginGoogle() {
  try { await authStore.signInWithGoogle() }
  catch (e) { error.value = e.message }
}
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.4s ease;
}

.auth-card__logo {
  font-size: 48px;
  text-align: center;
}

.auth-card__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  color: var(--text-primary);
}

.auth-card__sub {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.tabs {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.tab {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
}

.tab.active {
  background: var(--accent);
  color: white;
}

.auth-form { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field__input {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  color: var(--text-primary);
  font-size: 15px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.2s;
}

.field__input:focus { border-color: var(--accent); }

.auth-error {
  color: var(--error);
  font-size: 13px;
  background: rgba(248, 113, 113, 0.1);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.auth-success {
  color: var(--success);
  font-size: 13px;
  background: rgba(74, 222, 128, 0.1);
  padding: 10px 14px;
  border-radius: 8px;
}

.btn {
  padding: 14px;
  border-radius: var(--radius-sm);
  border: none;
  font-family: 'Unbounded', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn--primary {
  background: var(--accent);
  color: white;
}
.btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

.divider {
  text-align: center;
  position: relative;
  color: var(--text-muted);
  font-size: 12px;
}
.divider::before, .divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 42%;
  height: 1px;
  background: var(--border);
}
.divider::before { left: 0; }
.divider::after { right: 0; }

.btn--google {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn--google:hover { background: var(--bg-secondary); }

.google-icon {
  width: 20px;
  height: 20px;
  background: white;
  color: #4285f4;
  border-radius: 4px;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-link {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  text-decoration: none;
}

.back-link:hover { color: var(--text-secondary); }
</style>
