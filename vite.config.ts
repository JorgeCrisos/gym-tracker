import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/gym-tracker/'

export default defineConfig({
  base,
  root: 'app',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GymLog — Entrenamiento',
        short_name: 'GymLog',
        description: 'Tu entrenamiento. Tu progreso.',
        theme_color: '#11130f',
        background_color: '#11130f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ],
  build: { outDir: '../dist', emptyOutDir: true }
})
