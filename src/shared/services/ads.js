/**
 * AdsService — заглушка для Яндекс Рекламной Сети (YAN)
 * При интеграции YAN заменить методы на реальные вызовы SDK
 */

class AdsService {
  constructor() {
    this.initialized = false
    this.bannerVisible = false
  }

  /**
   * Инициализация рекламного SDK
   * TODO: заменить на инициализацию YAN при продакшн-интеграции
   */
  init() {
    // window.yaContextCb = window.yaContextCb || []
    // const script = document.createElement('script')
    // script.src = 'https://yandex.ru/ads/system/context.js'
    // document.head.appendChild(script)
    this.initialized = true
    console.log('[AdsService] Initialized (mock mode)')
  }

  /**
   * Показать баннер под картой
   * @param {string} containerId - ID DOM-элемента
   * @param {boolean} isSubscribed - если true, не показывать
   */
  showBanner(containerId, isSubscribed) {
    if (isSubscribed || !this.initialized) return

    const container = document.getElementById(containerId)
    if (!container) return

    // TODO: заменить на YAN блок
    // window.yaContextCb.push(() => {
    //   Ya.Context.AdvManager.render({ blockId: 'YOUR_BLOCK_ID', renderTo: containerId })
    // })

    // Mock — показываем заглушку
    container.innerHTML = `
      <div class="ad-banner-mock">
        <span>📢 Реклама (место для YAN)</span>
      </div>
    `
    this.bannerVisible = true
  }

  hideBanner(containerId) {
    const container = document.getElementById(containerId)
    if (container) container.innerHTML = ''
    this.bannerVisible = false
  }

  /**
   * Интерстициальная реклама после добавления точки
   * @param {boolean} isSubscribed
   */
  showInterstitial(isSubscribed) {
    if (isSubscribed) return

    // TODO: заменить на YAN interstitial
    // window.yaContextCb.push(() => {
    //   Ya.Context.AdvManager.render({ blockId: 'YOUR_INTERSTITIAL_BLOCK_ID', ... })
    // })

    console.log('[AdsService] Interstitial shown (mock)')
    // В реальности — открыть оверлей с рекламой
    const event = new CustomEvent('show-interstitial-ad')
    window.dispatchEvent(event)
  }
}

export const adsService = new AdsService()
