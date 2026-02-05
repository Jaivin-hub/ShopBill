import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Used to import the plugin
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // Enable history API fallback for SPA routing
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
  plugins: [
    react(),
    
    // 💥 CRITICAL FIX: Pass the configuration object directly to the plugin 💥
    tailwindcss({
      // This is the content that would normally go into tailwind.config.js
      // We set darkMode to 'class' to enable manual toggling.
      darkMode: 'class', // Enable class-based dark mode (Tailwind v4 format)
    }),
    // ----------------------------------------------------------------------
    
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: true,
        type: 'module', 
      },
      manifest: {
        name: 'Pocket POS - #1 Retail Management Tool | Point of Sale Software',
        short_name: 'Pocket POS',
        description: 'Pocket POS - The #1 retail management software for Indian shops. Lightning-fast billing, real-time inventory management, digital Khata ledger, GST billing, and business reports. Works offline, syncs to cloud.',
        start_url: '/',
        display: 'standalone',
        theme_color: '#34495e',
        background_color: '#1a1a1a',
        lang: 'en',
        scope: '/',
        icons: [
          {
            src: './pwa-192x192.png',
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
            purpose: 'maskable',
          },
        ],
      },
      
      workbox: {
        // Don't skip waiting - let the user confirm the update first
        skipWaiting: false, // User must confirm update
        clientsClaim: true, // Take control of all clients immediately after activation
        
        // Use network-first strategy for HTML to ensure fresh content
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/_/, /^\/socket.io/],
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'index.html'],
        
        // Add cache versioning to force cache invalidation on updates
        cacheId: 'pocket-pos-v1',
        
        // Clean up old caches on update
        cleanupOutdatedCaches: true,
        
        // Maximum cache size
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        
        runtimeCaching: [
          {
            // Network-first for HTML to get fresh content
            urlPattern: /^https?:\/\/.*\/.*\.html$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 3,
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
          // Add any other specific runtime caching rules here if needed
        ],
      },
    }),
  ],
})