import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register' 

// Register the Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch a custom event that App.jsx will listen for
    window.dispatchEvent(new CustomEvent('pwa-update-available', { 
      detail: { updateHandler: updateSW } 
    }));
  },
  onRegistered(registration) {
    console.log('Pocket POS Service Worker registered!');
  },
  onError(error) {
    console.error('Service Worker registration failed:', error)
  }
})

createRoot(document.getElementById('root')).render(
    <App />
)