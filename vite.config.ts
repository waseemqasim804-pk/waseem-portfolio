// vite.config.ts
// Tailwind v4 is handled by @tailwindcss/vite plugin below — no tailwind.config.js needed.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
