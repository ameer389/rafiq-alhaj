import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 24 * 60 * 60

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Offline-capable PWA: after ONE online visit the whole app shell (html/js/css/fonts/icons) is
    // precached, so it opens from the home screen in airplane mode. App DATA is not cached here —
    // the app keeps it in localStorage (campaign, messages, members, help-request queue).
    VitePWA({
      registerType: 'autoUpdate', // new deploy → new SW activates and the page reloads on next open
      injectRegister: 'auto',
      includeManifestIcons: false, // icons are already precached by globPatterns (avoids duplicate entries)
      manifest: {
        id: '/',
        name: 'رفيق الحاج',
        short_name: 'رفيق الحاج',
        description: 'صلتك بقائد حملتك، بلغتك',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1D5C4E',
        background_color: '#FFFFFF',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Full app shell, incl. the self-hosted IBM Plex Sans Arabic + Noto Nastaliq Urdu fonts.
        globPatterns: ['**/*.{html,js,css,woff,woff2,ttf,svg,png,ico}'],
        // Large source logo isn't used by the app — don't make every pilgrim download it.
        globIgnores: ['logo.png', 'logo-source.png'],
        // Every SPA route (/p, /p/lost, /l, /l/r/…) opens offline from the cached index.html.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Supabase REST / auth / functions / storage: never cached by the SW (realtime is a
            // websocket and isn't routed through the SW at all).
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            // OSM tiles the user actually viewed — no bulk prefetching (OSM tile usage policy).
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org' || url.hostname.endsWith('.tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 150, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // External fonts, if any are ever added (ours are self-hosted and precached).
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: { host: true },
})
