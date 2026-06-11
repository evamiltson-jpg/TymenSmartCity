import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['NEXT_PUBLIC_', 'VITE_'])
  const encryptionKey = (env.VITE_MESSAGE_ENCRYPTION_KEY ?? '').trim()

  if (!encryptionKey && mode === 'production') {
    console.warn(
      '[build] VITE_MESSAGE_ENCRYPTION_KEY не задан — сообщения чата сохранятся без шифрования.',
    )
  }

  return {
  envPrefix: ['NEXT_PUBLIC_', 'VITE_'],
  define: {
    'import.meta.env.VITE_MESSAGE_ENCRYPTION_KEY': JSON.stringify(encryptionKey),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  // Делаем относительные пути, чтобы статический сайт запускался из dist и с Live Server.
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          gemini: ['@google/genai'],
        },
      },
    },
  },
  }
})
