import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend only for now: all data lives in localStorage, so there is
// nothing to proxy. When the backend comes back, restore the server
// block and switch lib/api.js to fetch.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true }
})
