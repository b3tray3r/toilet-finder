<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <header class="modal__header">
        <h2 class="modal__title">Пожаловаться</h2>
        <button class="modal__close" @click="emit('close')">✕</button>
      </header>

      <form @submit.prevent="submit" class="modal__form">
        <div class="reason-list">
          <label
            v-for="r in reasons"
            :key="r"
            class="reason-item"
            :class="{ active: reason === r }"
          >
            <input type="radio" v-model="reason" :value="r" />
            {{ r }}
          </label>
        </div>

        <div class="field">
          <label class="field__label">Дополнительно</label>
          <textarea
            v-model="comment"
            class="field__input field__input--textarea"
            placeholder="Опишите проблему..."
            rows="3"
            maxlength="300"
          />
        </div>

        <p v-if="error" class="modal__error">{{ error }}</p>
        <p v-if="success" class="modal__success">✓ Жалоба отправлена, спасибо!</p>

        <button type="submit" class="btn btn--danger" :disabled="loading || !reason || !!success">
          {{ loading ? 'Отправляем...' : 'Отправить жалобу' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToiletsStore } from './store'
import { useAuthStore } from '@/modules/auth/store'

const props = defineProps({ toiletId: String })
const emit = defineEmits(['close'])

const toiletsStore = useToiletsStore()
const authStore = useAuthStore()

const reasons = [
  'Туалет не существует',
  'Туалет закрыт / снесён',
  'Неверное расположение',
  'Неверная информация',
  'Спам / дубликат'
]

const reason = ref('')
const comment = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

async function submit() {
  if (!authStore.isAuthenticated) { error.value = 'Войдите, чтобы отправить жалобу'; return }
  error.value = ''
  loading.value = true
  try {
    const fullReason = comment.value ? `${reason.value}: ${comment.value}` : reason.value
    await toiletsStore.report(props.toiletId, authStore.user.id, fullReason)
    success.value = true
    setTimeout(() => emit('close'), 1500)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
}

.modal {
  width: 100%;
  background: var(--bg-card);
  border-radius: var(--radius) var(--radius) 0 0;
  border: 1px solid var(--border);
  border-bottom: none;
  padding: 24px 20px 36px;
  animation: slideUp 0.3s ease;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 16px;
}

.modal__close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
}

.modal__form { display: flex; flex-direction: column; gap: 16px; }

.reason-list { display: flex; flex-direction: column; gap: 8px; }

.reason-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.reason-item input { display: none; }
.reason-item.active { border-color: var(--error); color: var(--text-primary); background: rgba(248,113,113,0.1); }

.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 6px;
}

.field__input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  outline: none;
  resize: none;
}

.field__input:focus { border-color: var(--accent); }

.modal__error { color: var(--error); font-size: 13px; }
.modal__success { color: var(--success); font-size: 13px; }

.btn {
  padding: 14px;
  border-radius: var(--radius-sm);
  border: none;
  font-family: 'Unbounded', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn--danger { background: var(--error); color: white; }
.btn--danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
