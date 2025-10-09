import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Used to import the plugin
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // 💥 CRITICAL FIX: Pass the configuration object directly to the plugin 💥
    tailwindcss({
      // This is the content that would normally go into tailwind.config.js
      // We set darkMode to 'class' to enable manual toggling.
      config: {
        darkMode: 'class', 
        content: [
          './index.html',
          './src/**/*.{js,ts,jsx,tsx}',
        ],
        // You can include theme extensions or other config here if needed
        theme: {
          extend: {},
        },
      }
    }),
    // ----------------------------------------------------------------------
    
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module', 
      },
      // ... (rest of PWA configuration remains the same)
      manifest: {
        name: 'Pocket POS',
        short_name: 'Pocket POS',
        description: 'Your Progressive Web App for Pocket POS',
        theme_color: '#34495e',
        background_color: '#1a1a1a',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'index.html'],
        
        runtimeCaching: [
          // ... (rest of workbox configuration remains the same)
        ],
      },
    }),
  ],
})