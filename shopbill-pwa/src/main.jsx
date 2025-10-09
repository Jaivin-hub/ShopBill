import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 1. Import the virtual module from vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register' 

// 2. Register the Service Worker and define the update logic
const updateSW = registerSW({
  onNeedRefresh() {
    // Prompt the user to reload when a new service worker is ready
    if (confirm("Pocket POS update ready! Reload now to get the newest features and fixes?")) {
      updateSW(true) // Forces the new Service Worker to activate immediately
    }
  },
  onRegistered(registration) {
    if (registration) {
      console.log('Pocket POS Service Worker registered successfully!')
    } else {
      console.log('Service Worker not registered.')
    }
  },
  onError(error) {
    console.error('Service Worker registration failed:', error)
  }
})

createRoot(document.getElementById('root')).render(
    <App />
)