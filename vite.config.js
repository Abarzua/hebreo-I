import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // IMPORTANTE PARA GITHUB PAGES: Cambia esto si tu repositorio no se llama igual
  base: './', 
})