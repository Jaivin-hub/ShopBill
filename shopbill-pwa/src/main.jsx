import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register' 

// Register the Service Worker with improved update detection
const updateSW = registerSW({
  immediate: true, // Check for updates immediately
  onNeedRefresh() {
    // Only dispatch event when there's actually a new version available
    // This callback is only called when a new service worker is detected
    console.log('🔄 New service worker detected - update available');
    window.dispatchEvent(new CustomEvent('pwa-update-available', { 
      detail: { 
        updateHandler: updateSW,
        registration: null // Will be set in UpdatePrompt component
      } 
    }));
  },
  onRegistered(registration) {
    console.log('✅ Pocket POS Service Worker registered!');
    // Store registration globally for UpdatePrompt to access
    window.__swRegistration = registration;
    
    // Set up periodic update checks
    if (registration) {
      // Check for updates every 30 seconds
      setInterval(() => {
        registration.update().catch(err => {
          console.warn('Periodic update check failed:', err);
        });
      }, 30 * 1000); // 30 seconds
    }
  },
  onRegisteredSW(swUrl, registration) {
    // Called when a new service worker is registered
    console.log('📦 New Service Worker registered at:', swUrl);
    
    // Listen for service worker updates
    if (registration) {
      registration.addEventListener('updatefound', () => {
        console.log('🔍 Service worker update found');
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is waiting
              console.log('⏳ New service worker is waiting');
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