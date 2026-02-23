import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function getCommonSiteConfig() {
  let currentDir = path.resolve(".");
  while (currentDir !== "/") {
    if (
      fs.existsSync(path.join(currentDir, "sites")) &&
      fs.existsSync(path.join(currentDir, "apps"))
    ) {
      const siteConfigPath = path.join(currentDir, "sites", "common_site_config.json");
      return fs.existsSync(siteConfigPath)
        ? JSON.parse(fs.readFileSync(siteConfigPath, "utf8"))
        : null;
    }
    currentDir = path.resolve(currentDir, "..");
  }
  return null;
}

function getProxyOptions() {
  const config = getCommonSiteConfig();
  const port = config ? config.webserver_port : 8000;
  return {
    "^/(app|login|api|assets|files|private)": {
      target: `http://127.0.0.1:${port}`,
      ws: true,
      router(req) {
        const site = req.headers.host.split(":")[0];
        return `http://${site}:${port}`;
      },
    },
  };
}

export default defineConfig({
  base: "/assets/math_bell/frontend/",
  server: {
    port: 8080,
    proxy: getProxyOptions(),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [react()],
  build: {
    outDir: "../math_bell/public/frontend",
    emptyOutDir: true,
    target: "es2019",
    sourcemap: true,
    assetsDir: "",
    rollupOptions: {
      output: {
        entryFileNames: "js/platform.js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || "";
          if (name.endsWith(".css")) return "css/platform.css";
          return "assets/[name][extname]";
        },
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
