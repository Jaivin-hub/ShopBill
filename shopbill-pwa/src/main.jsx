import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupAudioUnlock } from './utils/notificationSound'

setupAudioUnlock()
import { registerSW } from 'virtual:pwa-register' 

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