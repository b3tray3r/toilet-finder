import L from 'leaflet'
import 'leaflet.markercluster'

const DEFAULT_CENTER = [
  parseFloat(import.meta.env.VITE_DEFAULT_LAT) || 55.7558,
  parseFloat(import.meta.env.VITE_DEFAULT_LNG) || 37.6173
]
const DEFAULT_ZOOM = parseInt(import.meta.env.VITE_DEFAULT_ZOOM) || 13

const createIcon = (color, star = false) => L.divIcon({
  html: `<div class="map-marker map-marker--${color}">${star ? '⭐' : '🚾'}</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
})

const icons = {
  free: createIcon('green'),
  paid: createIcon('red'),
  confirmed: createIcon('gold', true)
}

function getIcon(toilet) {
  if (toilet.status === 'confirmed') return icons.confirmed
  if (toilet.is_paid) return icons.paid
  return icons.free
}

export class MapService {
  constructor() {
    this.map = null
    this.clusterGroup = null
    this.markers = new Map()       // toilet.id → marker
    this.toiletData = new Map()    // toilet.id → toilet (актуальные данные)
    this.clickCallback = null
    this.moveCallback = null
    this._moveDebounceTimer = null
    this._userMarker = null        // маркер геолокации пользователя
    this._userCircle = null        // круг точности геолокации
  }

  init(elementId, onMapClick, onMapMove) {
    this.map = L.map(elementId, {
      zoomControl: false,
      attributionControl: true
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map)

    L.control.zoom({ position: 'topright' }).addTo(this.map)

    this.clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60
    })
    this.map.addLayer(this.clusterGroup)

    this.clickCallback = onMapClick
    this.moveCallback = onMapMove

    this.map.on('click', (e) => {
      if (this.clickCallback) this.clickCallback(e.latlng.lat, e.latlng.lng)
    })

    this.map.on('moveend', () => {
      clearTimeout(this._moveDebounceTimer)
      this._moveDebounceTimer = setTimeout(() => {
        if (this.moveCallback) this.moveCallback(this.map.getBounds())
      }, 400)
    })

    return this
  }

  setView(lat, lng, zoom = DEFAULT_ZOOM) {
    this.map.setView([lat, lng], zoom)
  }

  /**
   * Показать маркер пользователя на карте
   */
  _showUserMarker(lat, lng, accuracy) {
    // Удалить старые если есть
    if (this._userMarker) this.map.removeLayer(this._userMarker)
    if (this._userCircle) this.map.removeLayer(this._userCircle)

    // Круг точности
    this._userCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: '#6c63ff',
      fillColor: '#6c63ff',
      fillOpacity: 0.1,
      weight: 1
    }).addTo(this.map)

    // Маркер позиции
    this._userMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#ffffff',
      fillColor: '#6c63ff',
      fillOpacity: 1,
      weight: 3
    }).addTo(this.map)

    this._userMarker.bindPopup('📍 Вы здесь')
  }

  /**
   * Центрировать на геолокации пользователя или Москве
   */
  async centerOnUser() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.setView(...DEFAULT_CENTER)
        resolve(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords
          this.setView(latitude, longitude)
          this._showUserMarker(latitude, longitude, accuracy)
          resolve(true)
        },
        (err) => {
          console.warn('Геолокация недоступна:', err.message)
          this.setView(...DEFAULT_CENTER)
          resolve(false)
        },
        { timeout: 8000, enableHighAccuracy: true }
      )
    })
  }

  getBounds() {
    return this.map.getBounds()
  }

  /**
   * Синхронизировать маркеры.
   * Popup пересоздаётся при каждом открытии — берёт актуальные данные из toiletData.
   */
  syncMarkers(toilets, popupBuilder) {
    const incomingIds = new Set(toilets.map(t => t.id))

    // Удалить устаревшие маркеры
    for (const [id, marker] of this.markers) {
      if (!incomingIds.has(id)) {
        this.clusterGroup.removeLayer(marker)
        this.markers.delete(id)
        this.toiletData.delete(id)
      }
    }

    for (const toilet of toilets) {
      // Всегда обновляем данные туалета
      this.toiletData.set(toilet.id, toilet)

      if (this.markers.has(toilet.id)) {
        // Обновить иконку и переоткрыть popup с актуальными данными
        const marker = this.markers.get(toilet.id)
        marker.setIcon(getIcon(toilet))
        // Обновить содержимое если popup открыт
        if (marker.isPopupOpen()) {
          marker.getPopup().setContent(() => {
            const div = document.createElement('div')
            div.innerHTML = popupBuilder(this.toiletData.get(toilet.id))
            return div
          })
          marker.getPopup().update()
        }
        continue
      }

      // Новый маркер — popup строится при открытии из актуальных данных
      const marker = L.marker([toilet.lat, toilet.lng], { icon: getIcon(toilet) })
      marker.bindPopup(() => {
        const div = document.createElement('div')
        div.innerHTML = popupBuilder(this.toiletData.get(toilet.id))
        return div
      }, { maxWidth: 280 })

      this.markers.set(toilet.id, marker)
      this.clusterGroup.addLayer(marker)
    }
  }

  /**
   * Принудительно обновить popup конкретного туалета
   */
  refreshMarker(toiletId, updatedToilet, popupBuilder) {
    this.toiletData.set(toiletId, updatedToilet)
    const marker = this.markers.get(toiletId)
    if (!marker) return
    marker.setIcon(getIcon(updatedToilet))
    if (marker.isPopupOpen()) {
      const div = document.createElement('div')
      div.innerHTML = popupBuilder(updatedToilet)
      marker.getPopup().setContent(div)
      marker.getPopup().update()
    }
  }

  setTempMarker(lat, lng) {
    if (this._tempMarker) this.map.removeLayer(this._tempMarker)
    this._tempMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: '<div class="map-marker map-marker--temp">📍</div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      })
    }).addTo(this.map)
  }

  removeTempMarker() {
    if (this._tempMarker) {
      this.map.removeLayer(this._tempMarker)
      this._tempMarker = null
    }
  }

  destroy() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }
}