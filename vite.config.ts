import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base:
    process.env.VITE_BASE_PATH ??
    (process.env.GITHUB_PAGES === 'true' ? '/taiwan-exchange-rally/' : '/'),
  plugins: [react()],
})
