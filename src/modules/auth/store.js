import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/shared/services/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isSubscribed = computed(() => profile.value?.is_subscribed ?? false)
  const isAdmin = computed(() => ['admin', 'moderator'].includes(profile.value?.role))

  async function init() {
    loading.value = true
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user.value = session.user
      await fetchProfile()
    }
    loading.value = false

    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      if (user.value) {
        await fetchProfile()
      } else {
        profile.value = null
      }
    })
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  async function toggleSubscription() {
    if (!profile.value) return
    const newValue = !profile.value.is_subscribed
    const { error } = await supabase
      .from('users_profile')
      .update({ is_subscribed: newValue })
      .eq('id', user.value.id)
    if (!error) profile.value.is_subscribed = newValue
  }

  return {
    user, profile, loading,
    isAuthenticated, isSubscribed, isAdmin,
    init, fetchProfile, signIn, signUp, signInWithGoogle, signOut, toggleSubscription
  }
})
