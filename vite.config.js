import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hebreo-I/', // <-- ¡Esta línea es la clave para evitar la pantalla blanca!
})
