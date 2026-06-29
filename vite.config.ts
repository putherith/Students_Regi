import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import rsc from "@vitejs/plugin-rsc/plugin";

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), rsc()]
});
