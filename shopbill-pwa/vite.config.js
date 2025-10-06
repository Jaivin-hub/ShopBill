import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa' // Import the plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Add the VitePWA plugin with configuration
    VitePWA({
      registerType: 'autoUpdate', // Automatically update the service worker
      devOptions: {
        enabled: true, // Enable PWA features during development (localhost/HTTPS)
        type: 'module', 
      },
      manifest: {
        name: 'Pocket POS',
        short_name: 'Pocket POS',
        description: 'Your Progressive Web App for Pocket POS',
        theme_color: '#34495e', // Updated to a dark theme color (like the one in your screenshot)
        background_color: '#1a1a1a', // Set background color for splash screen
        icons: [
          {
            src: './pwa-192x192.png', // Path relative to your 'public' folder
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable', // Required for adaptive icons on Android
          },
        ],
      },
      
      // --- WORKBOX CONFIGURATION FOR OFFLINE CACHING ---
      workbox: {
        // Cache all essential static files (HTML, JS, CSS, your PWA icons)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'index.html'],
        
        runtimeCaching: [
          {
            // Caching Strategy for Inventory/Products (high-priority for POS)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/products'),
            // Use 'CacheFirst': serve from cache instantly, update in background
            handler: 'CacheFirst', 
            options: {
              cacheName: 'pocketpos-products',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // Cache for 24 hours (adjust based on how often inventory changes)
              },
            },
          },
          {
            // Caching Strategy for Customer Data (often needed for lookups)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/customers'),
            // Use 'StaleWhileRevalidate': Fast response from cache, but always update in the background
            handler: 'StaleWhileRevalidate', 
            options: {
              cacheName: 'pocketpos-customers',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 12, // Cache for 12 hours
              },
            },
          },
          // You would also add logic for sales, images, etc., here.
        ],
      },
    }),
  ],
})