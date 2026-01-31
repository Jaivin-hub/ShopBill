import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register' 

// Register the Service Worker
const updateSW = registerSW({
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
    console.log('Pocket POS Service Worker registered!');
    // Store registration globally for UpdatePrompt to access
    window.__swRegistration = registration;
  },
  onRegisteredSW(swUrl, registration) {
    // Called when a new service worker is registered
    console.log('New Service Worker registered at:', swUrl);
  },
  onError(error) {
    console.error('Service Worker registration failed:', error)
  }
})

createRoot(document.getElementById('root')).render(
    <App />
)