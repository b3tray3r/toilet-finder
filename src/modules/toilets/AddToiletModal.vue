<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <header class="modal__header">
        <h2 class="modal__title">Добавить туалет</h2>
        <button class="modal__close" @click="emit('close')">✕</button>
      </header>

      <div class="modal__coords">
        📍 {{ lat.toFixed(5) }}, {{ lng.toFixed(5) }}
      </div>

      <form @submit.prevent="submit" class="modal__form">
        <div class="field">
          <label class="field__label">Название *</label>
          <input
            v-model="form.name"
            class="field__input"
            placeholder="Например: ТЦ Меркурий, 1 этаж"
            required
            maxlength="80"
          />
        </div>

        <div class="field">
          <label class="field__label">Описание</label>
          <textarea
            v-model="form.description"
            class="field__input field__input--textarea"
            placeholder="Режим работы, особенности..."
            rows="3"
            maxlength="300"
          />
        </div>

        <div class="field">
          <label class="toggle">
            <input type="checkbox" v-model="form.is_paid" />
            <span class="toggle__track"></span>
            <span class="toggle__label">{{ form.is_paid ? '💰 Платный' : '✅ Бесплатный' }}</span>
          </label>
        </div>

        <p v-if="error" class="modal__error">{{ error }}</p>

        <button type="submit" class="btn btn--primary" :disabled="loading">
          {{ loading ? 'Добавляем...' : 'Добавить точку' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useToiletsStore } from './store'
import { useAuthStore } from '@/modules/auth/store'

const props = defineProps({
  lat: Number,
  lng: Number,
  city: String
})

const emit = defineEmits(['close', 'added'])

const toiletsStore = useToiletsStore()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  description: '',
  is_paid: false
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await toiletsStore.addToilet({
      name: form.name.trim(),
      description: form.description.trim(),
      is_paid: form.is_paid,
      lat: props.lat,
      lng: props.lng,
      city: props.city,
      created_by: authStore.user.id
    })
    emit('added')
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
  max-height: 90vh;
  background: var(--bg-card);
  border-radius: var(--radius) var(--radius) 0 0;
  border: 1px solid var(--border);
  border-bottom: none;
  padding: 24px 20px 36px;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.modal__title {
  font-family: 'Unbounded', sans-serif;
  font-size: 16px;
  font-weight: 700;
}

.modal__close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
}

.modal__coords {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 20px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-family: monospace;
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.field__input {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  resize: none;
}

.field__input:focus { border-color: var(--accent); }

/* Toggle */
.toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle input { display: none; }

.toggle__track {
  width: 48px;
  height: 26px;
  background: var(--bg-elevated);
  border-radius: 13px;
  border: 1px solid var(--border);
  position: relative;
  transition: background 0.2s;
}

.toggle__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: all 0.2s;
}

.toggle input:checked ~ .toggle__track {
  background: rgba(108, 99, 255, 0.3);
  border-color: var(--accent);
}

.toggle input:checked ~ .toggle__track::after {
  left: 23px;
  background: var(--accent);
}

.toggle__label { font-size: 15px; color: var(--text-primary); }

.modal__error {
  color: var(--error);
  font-size: 13px;
  padding: 10px 14px;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.3);
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
  box-shadow: 0 4px 16px rgba(108, 99, 255, 0.4);
}

.btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
