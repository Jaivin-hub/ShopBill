import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import firebaseSwPlugin from './vite-firebase-sw-plugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // Use stable asset names to avoid stale HTML -> missing hashed chunk 404s
        // on deep links like /staff-setup/:token during rolling deployments.
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo?.name || '';
          if (name.endsWith('.css')) return 'assets/index.css';
          return 'assets/[name][extname]';
        },
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
        },
      },
    },
  },
  plugins: [
    firebaseSwPlugin(),
    react(),
    
    // 💥 CRITICAL FIX: Pass the configuration object directly to the plugin 💥
    tailwindcss({
      // This is the content that would normally go into tailwind.config.js
      // We set darkMode to 'class' to enable manual toggling.
      darkMode: 'class', // Enable class-based dark mode (Tailwind v4 format)
    }),
    // ----------------------------------------------------------------------
    
    VitePWA({
      // Auto-apply new SW so precached index + hashed chunks stay one consistent build (avoids lazy-chunk 404s after deploy).
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module', 
      },
      manifest: {
        name: 'Pocket Pos',
        short_name: 'Pocket Pos',
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
        skipWaiting: true,
        clientsClaim: true,
        
        // Use network-first strategy for HTML to ensure fresh content
        navigateFallback: '/index.html',
        // Keep Firebase messaging + main SW URLs out of SPA fallback (avoids wrong document for SW navigations in edge cases).
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/_/,
          /^\/socket\.io/,
          /^\/firebase-messaging-sw\.js$/,
          /^\/sw\.js$/,
          /^\/dev-sw\.js$/,
          /^\/workbox.*\.js$/,
        ],
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'index.html'],
        
        // Bump when you need to invalidate all Workbox caches in the field (deploy mismatch recovery).
        cacheId: 'pocket-pos-v3',
        
        // Clean up old caches on update
        cleanupOutdatedCaches: true,
        
        // Lazy route chunks can exceed 5MB in large apps; keep them precached so offline + SW stay consistent
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        
        runtimeCaching: [
          {
            // Same-origin built assets: prefer network so a new deploy’s chunks load even if an old precache entry lingers briefly
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-network-first',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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