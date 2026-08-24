import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sayingModeForViteMode } from "@badge/saying-live-contract";
import { createSayingServerPlugin } from "./saying-server/plugin.js";

export { sayingModeForViteMode } from "@badge/saying-live-contract";

const root = path.dirname(fileURLToPath(import.meta.url));

export const hostEntryPoints = Object.freeze({
  archive: path.resolve(root, "index.html"),
  studio: path.resolve(root, "studio/index.html"),
});

export const hostServerOptions = Object.freeze({
  host: "127.0.0.1",
  port: 5173,
  strictPort: true,
  preTransformRequests: false,
});

export function canonicalStudioLocation(requestUrl: string): string | null {
  const queryIndex = requestUrl.indexOf("?");
  const pathname = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);
  if (pathname !== "/studio") return null;
  const query = queryIndex === -1 ? "" : requestUrl.slice(queryIndex);
  return `/studio/${query}`;
}

export function studioEntryRewrite(requestUrl: string, acceptHeader = ""): string | null {
  const queryIndex = requestUrl.indexOf("?");
  const pathname = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);
  if (pathname === "/studio/" || !pathname.startsWith("/studio/") || !/\btext\/html\b/iu.test(acceptHeader)) {
    return null;
  }
  const query = queryIndex === -1 ? "" : requestUrl.slice(queryIndex);
  return `/studio/${query}`;
}

function studioCanonicalRedirect() {
  const redirect = (
    request: { headers?: { accept?: string }; url?: string },
    response: { statusCode: number; setHeader(name: string, value: string): void; end(): void },
    next: () => void,
  ) => {
    const location = canonicalStudioLocation(request.url ?? "/");
    if (!location) return next();
    response.statusCode = 308;
    response.setHeader("Location", location);
    response.end();
  };
  const routeStudioDocuments = (
    request: { headers?: { accept?: string }; url?: string },
    _response: unknown,
    next: () => void,
  ) => {
    const rewritten = studioEntryRewrite(request.url ?? "/", request.headers?.accept);
    if (rewritten) request.url = rewritten;
    next();
  };
  return {
    name: "badge-studio-canonical-path",
    enforce: "pre" as const,
    configureServer(server: { middlewares: { use(middleware: typeof redirect): void } }) {
      server.middlewares.use(redirect);
      server.middlewares.use(routeStudioDocuments);
    },
    configurePreviewServer(server: { middlewares: { use(middleware: typeof redirect): void } }) {
      server.middlewares.use(redirect);
      server.middlewares.use(routeStudioDocuments);
    },
  };
}

export default defineConfig(({ mode }) => ({
  root,
  publicDir: path.resolve(root, "../../tmp/generated/archive-fixtures"),
  plugins: [
    createSayingServerPlugin({ mode: sayingModeForViteMode(mode) }),
    studioCanonicalRedirect(),
    react(),
  ],
  resolve: {
    alias: [
      { find: "/@badge-archive", replacement: path.resolve(root, "../archive-web/src") },
      { find: "/@badge-studio", replacement: path.resolve(root, "../studio-web/src") },
    ],
  },
  server: hostServerOptions,
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: {
    outDir: path.resolve(root, "../../dist/local"),
    emptyOutDir: true,
    rollupOptions: { input: hostEntryPoints },
  },
}));
