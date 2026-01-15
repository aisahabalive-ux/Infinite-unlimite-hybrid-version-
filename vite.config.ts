import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Agar file root mein hai, toh base ki zaroorat nahi hai
})
