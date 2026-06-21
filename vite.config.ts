/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Self-destroying: ships a SW that unregisters any previously-installed
      // service worker and clears its caches, then gets out of the way. During
      // active iteration the precache was serving stale bundles. Re-enable a
      // caching SW later if offline support becomes a priority.
      selfDestroying: true,
      registerType: 'autoUpdate',
      manifest: {
        name: 'FastTrack',
        short_name: 'FastTrack',
        description: 'Local-first diet, training, fasting and body-measurement tracker',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/db/**'],
    },
  },
})
