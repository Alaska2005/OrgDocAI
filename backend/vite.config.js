// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',      // auto-update service worker silently
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'OrgDoc AI',
        short_name: 'OrgDoc',
        description: 'Centralized documentation and event archive platform for organizations',
        theme_color: '#6C63FF',
        background_color: '#F4F3FF',
        display: 'standalone',          // fullscreen app — no browser chrome
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',   // Android adaptive icon
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',   // Play Store / home screen icon
          },
        ],
        screenshots: [
          {
            src: 'screenshots/dashboard.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard',
          },
        ],
        categories: ['productivity', 'utilities', 'business'],
        shortcuts: [
          {
            name: 'New Event',
            short_name: 'New Event',
            description: 'Create a new event',
            url: '/events?new=true',
            icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'AI Chat',
            short_name: 'AI Chat',
            description: 'Open AI assistant',
            url: '/chat',
            icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        // Cache strategy — cache first for static assets, network first for API
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',   // always try network, fall back to cache
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: true,   // enable PWA in dev mode for testing
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
