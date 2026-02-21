import L from 'leaflet'
import 'leaflet.markercluster'

const DEFAULT_CENTER = [
  parseFloat(import.meta.env.VITE_DEFAULT_LAT) || 55.7558,
  parseFloat(import.meta.env.VITE_DEFAULT_LNG) || 37.6173
]
const DEFAULT_ZOOM = parseInt(import.meta.env.VITE_DEFAULT_ZOOM) || 13

/**
 * Иконки маркеров
 */
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
    this.markers = new Map() // toilet.id → marker
    this.clickCallback = null
    this.moveCallback = null
    this._moveDebounceTimer = null
  }

  /**
   * Инициализация карты
   * @param {string} elementId
   * @param {Function} onMapClick - (lat, lng) => void
   * @param {Function} onMapMove - (bounds) => void
   */
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

  /**
   * Установить вид карты
   */
  setView(lat, lng, zoom = DEFAULT_ZOOM) {
    this.map.setView([lat, lng], zoom)
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
          this.setView(pos.coords.latitude, pos.coords.longitude)
          resolve(true)
        },
        () => {
          this.setView(...DEFAULT_CENTER)
          resolve(false)
        },
        { timeout: 5000 }
      )
    })
  }

  getBounds() {
    return this.map.getBounds()
  }

  /**
   * Синхронизировать маркеры с массивом туалетов
   * @param {Array} toilets
   * @param {Function} popupBuilder - (toilet) => HTMLString
   */
  syncMarkers(toilets, popupBuilder) {
    const incomingIds = new Set(toilets.map(t => t.id))

    // Удалить устаревшие маркеры
    for (const [id, marker] of this.markers) {
      if (!incomingIds.has(id)) {
        this.clusterGroup.removeLayer(marker)
        this.markers.delete(id)
      }
    }

    // Добавить новые маркеры
    for (const toilet of toilets) {
      if (this.markers.has(toilet.id)) {
        // Обновить иконку (votes/status мог измениться)
        this.markers.get(toilet.id).setIcon(getIcon(toilet))
        continue
      }
      const marker = L.marker([toilet.lat, toilet.lng], { icon: getIcon(toilet) })
      marker.bindPopup(() => {
        const div = document.createElement('div')
        div.innerHTML = popupBuilder(toilet)
        return div
      }, { maxWidth: 280 })
      this.markers.set(toilet.id, marker)
      this.clusterGroup.addLayer(marker)
    }
  }

  /**
   * Добавить временный маркер выбора точки
   */
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
