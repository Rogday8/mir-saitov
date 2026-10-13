import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // относительные пути — сайт открывается и с GitHub Pages (/mir-saitov/), и с любого домена
  base: './',
  plugins: [react(), tailwindcss()],
  // three.js попадает в отдельный файл сам: 3D-планета подгружается лениво (lazy в Hero.tsx)
  build: { chunkSizeWarningLimit: 1100 },
})
