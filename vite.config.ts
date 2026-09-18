import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Lovable + the Cloudflare rewrite at madmonkeyhostels.com/all-in-trips
  // need relative asset paths. The Vercel demo serves from a domain root,
  // where relative paths break nested routes, so that build gets "/".
  base: mode === "preview-demo" ? "/" : "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
