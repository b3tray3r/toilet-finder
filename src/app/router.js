import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/store'

const routes = [
  {
    path: '/',
    redirect: () => {
      const city = import.meta.env.VITE_DEFAULT_CITY || 'moscow'
      return `/toilets/${city}`
    }
  },
  {
    path: '/toilets/:city',
    component: () => import('@/app/views/MapView.vue'),
    meta: { title: 'Карта туалетов' }
  },
  {
    path: '/profile',
    component: () => import('@/app/views/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Профиль' }
  },
  {
    path: '/auth',
    component: () => import('@/app/views/AuthView.vue'),
    meta: { title: 'Войти' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  if (to.meta.title) document.title = `${to.meta.title} — Найди туалет`

  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return '/auth'
  }
})
