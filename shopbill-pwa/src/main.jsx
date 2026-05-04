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

// Register the Service Worker with improved update detection
const updateSW = registerSW({
  immediate: true, // Check for updates immediately
  onNeedRefresh() {
    // Only dispatch event when there's actually a new version available
    // This callback is only called when a new service worker is detected
    window.dispatchEvent(new CustomEvent('pwa-update-available', { 
      detail: { 
        updateHandler: updateSW,
        registration: null // Will be set in UpdatePrompt component
      } 
    }));
  },
  onRegistered(registration) {
    // Store registration globally for UpdatePrompt to access
    window.__swRegistration = registration;
    
    // Set up periodic update checks.
    if (registration) {
      // Check for updates every 5 minutes to reduce network/battery overhead.
      setInterval(() => {
        registration.update().catch(err => {
          console.warn('Periodic update check failed:', err);
        });
      }, 5 * 60 * 1000);
    }
  },
  onRegisteredSW(swUrl, registration) {
    // Called when a new service worker is registered
    
    // Listen for service worker updates
    if (registration) {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is waiting
              window.dispatchEvent(new CustomEvent('pwa-update-available', { 
                detail: { 
                  updateHandler: updateSW,
                  registration: registration
                } 
              }));
            }
          });
        }
      });
    }
  },
  onError(error) {
    console.error('❌ Service Worker registration failed:', error);
  }
})

createRoot(document.getElementById('root')).render(
    <App />
)