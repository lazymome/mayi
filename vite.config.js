import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDesktop = mode === 'desktop'

  return {
    plugins: isDesktop ? [react()] : [react(), viteSingleFile()],
    base: isDesktop ? './' : '/',
    build: {
      emptyOutDir: false,
      minify: true,
      cssCodeSplit: isDesktop, // Desktop builds can keep normal static assets.
      assetsInlineLimit: isDesktop ? 4096 : 100000000, // Web portable builds remain single-file.
    }
  }
})
