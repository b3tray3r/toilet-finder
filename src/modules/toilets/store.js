import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/shared/services/supabase'

export const useToiletsStore = defineStore('toilets', () => {
  const toilets = ref([])
  const loading = ref(false)
  const userVotes = ref(new Set()) // toilet_ids voted by current user

  async function fetchInBounds(bounds, city = null) {
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('get_toilets_in_bounds', {
        min_lat: bounds.getSouth(),
        min_lng: bounds.getWest(),
        max_lat: bounds.getNorth(),
        max_lng: bounds.getEast(),
        p_city: city
      })
      if (error) throw error
      toilets.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function addToilet(payload) {
    // Проверяем лимит
    const { data: canAdd } = await supabase.rpc('can_add_toilet', {
      p_user_id: payload.created_by
    })
    if (!canAdd) throw new Error('Достигнут дневной лимит добавления точек (3 в день)')

    // Проверяем радиус 20м
    const nearby = toilets.value.find(t => {
      const dist = getDistanceMeters(t.lat, t.lng, payload.lat, payload.lng)
      return dist < 20
    })
    if (nearby) throw new Error('В радиусе 20м уже существует точка')

    const { data, error } = await supabase
      .from('toilets')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    toilets.value.push(data)
    return data
  }

  async function vote(toiletId, userId) {
    if (userVotes.value.has(toiletId)) throw new Error('Вы уже голосовали за эту точку')

    const { error } = await supabase
      .from('votes')
      .insert({ toilet_id: toiletId, user_id: userId })
    if (error) {
      if (error.code === '23505') throw new Error('Вы уже голосовали за эту точку')
      throw error
    }

    userVotes.value.add(toiletId)
    const toilet = toilets.value.find(t => t.id === toiletId)
    if (toilet) {
      toilet.votes++
      if (toilet.votes >= 10) toilet.status = 'confirmed'
    }
  }

  async function report(toiletId, userId, reason) {
    const { error } = await supabase
      .from('reports')
      .insert({ toilet_id: toiletId, user_id: userId, reason })
    if (error) throw error
  }

  async function loadUserVotes(userId) {
    const { data } = await supabase
      .from('votes')
      .select('toilet_id')
      .eq('user_id', userId)
    if (data) userVotes.value = new Set(data.map(v => v.toilet_id))
  }

  function getDistanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  return { toilets, loading, userVotes, fetchInBounds, addToilet, vote, report, loadUserVotes }
})
