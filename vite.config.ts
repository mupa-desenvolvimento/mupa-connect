import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "logo.svg", "app-icon.svg"],
      manifest: {
        name: "Mupa Mídias",
        short_name: "Mupa",
        description: "Plataforma de Gerenciamento Digital Signage",
        theme_color: "#0a0a0c",
        background_color: "#0a0a0c",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "app-icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "app-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
