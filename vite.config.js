import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api/v2/oauth': {
        target: 'https://ngw.devices.sberbank.ru:9443',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1': {
        target: 'https://gigachat.devices.sberbank.ru',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
