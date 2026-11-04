import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: mode === 'test' ? [] : [UnoCSS()],
}))
