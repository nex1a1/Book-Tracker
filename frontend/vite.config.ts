import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
    watch: {
      usePolling: true, // For Hot Reload in Windows/Docker environments
    },
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_TARGET || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
