import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api/admin': process.env.BACKEND_URL || 'http://localhost:2567',
    }
  }
})
