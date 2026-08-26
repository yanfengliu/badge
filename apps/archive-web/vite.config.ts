import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  publicDir: path.resolve(root, "../../tmp/generated/archive-fixtures"),
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: {
    outDir: path.resolve(root, "../../dist/archive"),
    emptyOutDir: true,
    rolldownOptions: { output: { assetFileNames: archiveAssetFileName } },
  },
});

export function archiveAssetFileName(asset: { readonly originalFileNames: readonly string[] }): string {
  const catalogueMedia = asset.originalFileNames
    .map((file) => file.replaceAll("\\", "/"))
    .map((file) =>
      /(?:^|\/)assets\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(thumbnails|details)\/[^/]+\.jpg$/u.exec(file),
    )
    .find((match) => match !== null);
  if (!catalogueMedia) return "assets/[name]-[hash][extname]";
  const tier = catalogueMedia[2] === "details" ? "discovery-details" : "discovery";
  return `assets/${tier}/${catalogueMedia[1]}/[name]-[hash][extname]`;
}
