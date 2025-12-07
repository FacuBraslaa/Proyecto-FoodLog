import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración básica de Vite para React
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // permite acceso desde la red (no solo localhost)
    port: 5173, // puerto para desarrollo local
  },
  build: {
    outDir: "dist", // carpeta de salida para producción (lo que espera Vercel)
  },
});
