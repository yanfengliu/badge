export const SAYING_SERVER_SHUTDOWN = Symbol.for("badge.saying-server.shutdown.v1");

export interface SayingServerShutdownHost {
  [SAYING_SERVER_SHUTDOWN]?: () => Promise<void>;
}

export function registerSayingServerShutdown(
  host: SayingServerShutdownHost,
  shutdown: () => Promise<void>,
): () => void {
  if (host[SAYING_SERVER_SHUTDOWN]) {
    throw new Error("Badge saying server shutdown is already registered on this local listener.");
  }
  Object.defineProperty(host, SAYING_SERVER_SHUTDOWN, {
    configurable: true,
    enumerable: false,
    value: shutdown,
    writable: false,
  });
  return () => {
    if (host[SAYING_SERVER_SHUTDOWN] === shutdown) delete host[SAYING_SERVER_SHUTDOWN];
  };
}
