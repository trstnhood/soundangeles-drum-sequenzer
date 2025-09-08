import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { directoryDiscoveryPlugin } from "./vite-directory-plugin.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base URL für Production - relative Pfade für maximale Flexibilität
  base: mode === 'production' ? './' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    directoryDiscoveryPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
