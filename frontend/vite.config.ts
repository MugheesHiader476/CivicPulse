import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Serves /config.js during `vite` and `vite preview`, mirroring what nginx generates at container
 * start in production (see nginx/default.conf.template). Without it, the dev server would 404 the
 * script tag in index.html.
 */
function runtimeConfigDevServer(environment: string, clerkPublishableKey: string): Plugin {
  const body = `window.__CIVICPULSE_CONFIG__ = Object.freeze(${JSON.stringify({
    environment,
    refreshSeconds: "15",
    clerkPublishableKey,
  })});\n`;

  return {
    name: "civicpulse-runtime-config",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/config.js") return next();
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/config.js") return next();
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY ?? env.CLERK_PUBLISHABLE_KEY ?? "";
  // Where the dev server forwards /api. Only used on a developer laptop; in containers nginx proxies
  // /api to the backend service by name, so the browser never needs an absolute backend URL.
  const apiTarget = process.env.CIVICPULSE_API_TARGET ?? "http://127.0.0.1:8000";
  const apiProxy = { "/api": { target: apiTarget, changeOrigin: false } };

  return {
    plugins: [react(), runtimeConfigDevServer(mode === "mock" ? "mock-api" : "development", clerkPublishableKey)],
    server: { port: 5173, proxy: apiProxy },
    preview: { port: 4173, proxy: apiProxy },
    build: {
      target: "es2020",
      sourcemap: false,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      css: false,
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/mocks/**", "src/api/schema.gen.ts", "src/main.tsx"],
        reporter: ["text-summary", "lcov"],
      },
    },
  };
});
