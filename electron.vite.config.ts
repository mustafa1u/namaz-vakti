import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist/main"
    },
    resolve: {
      alias: {
        "@shared": resolve("src/shared"),
        "@domain": resolve("src/domain"),
        "@services": resolve("src/services")
      }
    }
  },
  preload: {
    build: {
      outDir: "dist/preload"
    },
    resolve: {
      alias: {
        "@shared": resolve("src/shared")
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@shared": resolve("src/shared")
      }
    }
  }
});
