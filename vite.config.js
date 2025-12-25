import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

// http://ai-service.tal.com/openai-compatible/v1/chat/completions
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://ai-service.tal.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  optimizeDeps: {
    exclude: ['@google/genai'], // 不再需要 Google GenAI SDK
  }
})



