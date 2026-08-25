import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sayingModeForViteMode } from "@badge/saying-live-contract";
import { createSayingServerPlugin } from "./saying-server/plugin.js";

export { sayingModeForViteMode } from "@badge/saying-live-contract";

const root = path.dirname(fileURLToPath(import.meta.url));

export const hostEntryPoint = path.resolve(root, "index.html");

export const hostServerOptions = Object.freeze({
  host: "127.0.0.1",
  port: 5173,
  strictPort: true,
  preTransformRequests: false,
});

export function legacyStudioLocation(requestUrl: string, acceptHeader = "text/html"): string | null {
  const url = new URL(requestUrl, "http://badge.local");
  if (!/^\/studio(?:\/|$)/u.test(url.pathname) || !/\btext\/html\b/iu.test(acceptHeader)) return null;
  return `/${url.search}#studio`;
}

function legacyStudioRedirect() {
  const redirect = (
    request: { headers?: { accept?: string }; url?: string },
    response: { statusCode: number; setHeader(name: string, value: string): void; end(): void },
    next: () => void,
  ) => {
    const location = legacyStudioLocation(request.url ?? "/", request.headers?.accept);
    if (!location) return next();
    response.statusCode = 308;
    response.setHeader("Location", location);
    response.end();
  };
  return {
    name: "badge-studio-root-section-redirect",
    enforce: "pre" as const,
    configureServer(server: { middlewares: { use(middleware: typeof redirect): void } }) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server: { middlewares: { use(middleware: typeof redirect): void } }) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig(({ mode }) => ({
  root,
  publicDir: path.resolve(root, "../../tmp/generated/archive-fixtures"),
  plugins: [createSayingServerPlugin({ mode: sayingModeForViteMode(mode) }), legacyStudioRedirect(), react()],
  resolve: {
    alias: [
      { find: "/@badge-host", replacement: path.resolve(root, "src") },
      { find: "/@badge-archive", replacement: path.resolve(root, "../archive-web/src") },
      { find: "/@badge-studio", replacement: path.resolve(root, "../studio-web/src") },
    ],
  },
  server: hostServerOptions,
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: {
    outDir: path.resolve(root, "../../dist/local"),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: hostEntryPoint },
  },
}));
