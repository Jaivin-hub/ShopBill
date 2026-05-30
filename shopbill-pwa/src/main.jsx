import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupAudioUnlock } from './utils/notificationSound'

setupAudioUnlock()
import { registerSW } from 'virtual:pwa-register'

/** After a deploy, cached entry can reference removed hashed chunks → dynamic import 404. Reload once; repeat within 90s → unregister SW + reload. */
const CHUNK_FAIL_KEY = 'pocketpos_chunk_recovery_ts'
function isChunkLoadError(reason) {
  const msg = reason?.message || String(reason || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed')
  )
}
window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLoadError(event.reason)) return
  event.preventDefault()
  const now = Date.now()
  const prev = Number(sessionStorage.getItem(CHUNK_FAIL_KEY) || '0')
  if (!prev || now - prev > 90_000) {
    sessionStorage.setItem(CHUNK_FAIL_KEY, String(now))
    window.location.reload()
    return
  }
  sessionStorage.removeItem(CHUNK_FAIL_KEY)
  ;(async () => {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.()
      if (regs?.length) await Promise.all(regs.map((r) => r.unregister()))
    } catch {
      void 0
    }
    window.location.reload()
  })()
})

const dispatchPwaUpdate = (updateHandler, registration = null) => {
  const reg = registration || window.__swRegistration || null
  window.dispatchEvent(
    new CustomEvent('pwa-update-available', {
      detail: { updateHandler, registration: reg },
    })
  )
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    dispatchPwaUpdate(updateSW, window.__swRegistration)
  },
  onRegistered(registration) {
    window.__swRegistration = registration
    if (!registration) return

    const poll = () => {
      registration.update().catch((err) => {
        console.warn('[PWA] periodic update check failed:', err)
      })
    }

    poll()
    setInterval(poll, 2 * 60 * 1000)

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          dispatchPwaUpdate(updateSW, registration)
        }
      })
    })
  },
  onOfflineReady() {
    console.info('[PWA] App ready to work offline')
  },
  onRegisterError(error) {
    console.error('[PWA] Service worker registration failed:', error)
  },
})

createRoot(document.getElementById('root')).render(<App />)
