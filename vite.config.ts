// vite.config.ts
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const DISABLE_SOURCEMAP =
  String(process.env.DISABLE_SOURCEMAP || "").toLowerCase() === "true";

// Replit gives a dynamic PORT. Locally it'll fall back to 5173.
const DEV_PORT = Number(process.env.PORT || 5173);

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    // frontend lives in /client
    root: "client",

    plugins: [
      react(),
      isDev ? expressPlugin() : undefined,
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "icons/*.png", "apple-touch-icon.png"],
        devOptions: {
          enabled: false,
          type: "module",
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.replit\.dev\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: "Ashish Property - Buy & Sell Properties",
          short_name: "Ashish Property",
          description:
            "Find and sell properties easily in Rohtak and nearby areas",
          theme_color: "#C70000",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          categories: ["business", "productivity", "lifestyle"],
          icons: [
            {
              src: "/icons/icon-48.png",
              sizes: "48x48",
              type: "image/png",
            },
            {
              src: "/icons/icon-72.png",
              sizes: "72x72",
              type: "image/png",
            },
            {
              src: "/icons/icon-96.png",
              sizes: "96x96",
              type: "image/png",
            },
            {
              src: "/icons/icon-144.png",
              sizes: "144x144",
              type: "image/png",
            },
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
          shortcuts: [
            {
              name: "Sell Property",
              short_name: "Sell",
              description: "Post a new property for sale",
              url: "/post-property",
              icons: [
                {
                  src: "/icons/icon-192.png",
                  sizes: "192x192",
                  type: "image/png",
                },
              ],
            },
            {
              name: "Search Properties",
              short_name: "Search",
              description: "Search for properties",
              url: "/search",
              icons: [
                {
                  src: "/icons/icon-192.png",
                  sizes: "192x192",
                  type: "image/png",
                },
              ],
            },
          ],
        },
      }),
    ].filter(Boolean) as Plugin[],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client"),
        "@shared": path.resolve(__dirname, "shared"),
      },
    },

    base: "/",

    server: {
      host: true, // 0.0.0.0 (required on Replit)
      port: DEV_PORT,
      strictPort: false, // allow fallback if taken
      // Allow Replit preview/tunnel subdomains
      allowedHosts: [".replit.dev", ".repl.co", "localhost"],
      hmr: {
        protocol: "wss",
        clientPort: 443,
        host: undefined, // auto-detect
      },
      cors: true,
    },

    // also for `vite preview`
    preview: {
      host: true,
      port: DEV_PORT,
      allowedHosts: [".replit.dev", ".repl.co", "localhost"],
    },

    // Prevent Vite from touching server-only deps
    optimizeDeps: {
      exclude: ["razorpay"],
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      minify: "esbuild",
      sourcemap: command === "serve" ? true : !DISABLE_SOURCEMAP,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) return "vendor";
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },

    css: { devSourcemap: true },
  };
});

// ---- Dev-only: mount your Express server (server/index.ts) under Vite ----
function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    async configureServer(viteServer) {
      const serverPath = path.resolve(process.cwd(), "server/index.ts");

      let srv: any;
      try {
        // Let Vite transpile TS on the fly
        srv = await viteServer.ssrLoadModule(serverPath);
      } catch (err) {
        console.error("Failed to load server with SSR:", err);
        try {
          srv = await import(serverPath);
        } catch (e) {
          console.error("Failed to import server:", e);
          srv = {
            createServer: () => (req: any, res: any, next: any) => next(),
            initializeSocket: () => {},
          };
        }
      }

      const createServer =
        srv.createServer ||
        srv.default ||
        (() => (req: any, res: any, next: any) => next());
      const initializeSocket = srv.initializeSocket || (() => {});

      const app =
        typeof createServer === "function" ? createServer() : createServer;

      if (viteServer.httpServer) {
        initializeSocket(viteServer.httpServer);
        console.log("🔌 Socket.io initialized in Vite dev server");
      }

      // @ts-ignore
      viteServer.middlewares.use(app);
    },
  };
}
