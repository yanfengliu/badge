import type { Plugin, PreviewServer, ViteDevServer } from "vite";

import { ClaudeSayingGenerator, type SayingGenerator } from "./generator.js";
import { SayingServerRuntime } from "./middleware.js";
import { registerSayingServerShutdown, type SayingServerShutdownHost } from "./shutdown-registry.js";

export type SayingServerMode = "fixture" | "live";

export interface SayingServerPluginOptions {
  readonly mode: SayingServerMode;
  readonly createGenerator?: (mode: SayingServerMode) => SayingGenerator;
}

type SayingHost = (ViteDevServer | PreviewServer) & SayingServerShutdownHost;

export function createSayingServerPlugin(options: SayingServerPluginOptions): Plugin {
  if (options.mode === "fixture") {
    return { name: "badge-archive-saying-server-disabled-in-fixture-mode" };
  }
  const runtimes = new Set<SayingServerRuntime>();
  const unregister = new Map<SayingServerRuntime, () => void>();
  const makeGenerator = options.createGenerator ?? (() => new ClaudeSayingGenerator());

  const configure = (server: SayingHost) => {
    const runtime = new SayingServerRuntime(makeGenerator(options.mode));
    runtimes.add(runtime);
    unregister.set(
      runtime,
      registerSayingServerShutdown(server, () => runtime.shutdown()),
    );
    server.middlewares.use(runtime.middleware);
  };
  const closeAll = async () => {
    const held = [...runtimes];
    await Promise.all(held.map((runtime) => runtime.shutdown()));
    for (const runtime of held) {
      unregister.get(runtime)?.();
      unregister.delete(runtime);
      runtimes.delete(runtime);
    }
  };

  return {
    name: "badge-archive-saying-server",
    enforce: "pre",
    configureServer(server) {
      configure(server);
    },
    configurePreviewServer(server) {
      configure(server);
    },
    async closeBundle() {
      await closeAll();
    },
  };
}
