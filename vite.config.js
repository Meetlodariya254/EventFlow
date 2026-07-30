import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Force Vercel cache invalidation: 1
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables if needed by other plugins in the future
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: true,
      allowedHosts: true,
    },
    plugins: [
      react(),
    ],
  };
})
