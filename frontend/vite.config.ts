import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Necesario para que el contenedor Docker exponga el puerto al host
    host: '0.0.0.0',
    port: 5173,
  },
})
