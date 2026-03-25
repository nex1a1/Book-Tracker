// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true, // เพิ่มบรรทัดนี้เพื่อให้ Hot Reload ทำงานบน Windows/Docker
    },
    proxy: {
      "/api": {
        target: "http://backend:3001",
        changeOrigin: true,
      },
    },
  },
});