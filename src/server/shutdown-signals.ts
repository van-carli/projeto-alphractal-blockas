const shutdownHandlersKey = "__alphractalShutdownHandlers__" as const;

type ShutdownGlobal = typeof globalThis & {
  [shutdownHandlersKey]?: boolean;
};

export function registerShutdownSignals(
  shutdownServer: () => Promise<void>
): void {
  const globalScope = globalThis as ShutdownGlobal;
  if (globalScope[shutdownHandlersKey]) return;

  const shutdown = () => {
    void shutdownServer().catch(() => {
      console.error("[runtime] falha durante encerramento gracioso");
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  globalScope[shutdownHandlersKey] = true;
}
