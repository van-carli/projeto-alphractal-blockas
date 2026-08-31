const shutdownHandlersKey = "__alphractalShutdownHandlers__" as const;

type InstrumentationGlobal = typeof globalThis & {
  [shutdownHandlersKey]?: boolean;
};

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { bootstrapServer, shutdownServer } = await import("./server/bootstrap");
  await bootstrapServer();

  const globalScope = globalThis as InstrumentationGlobal;
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
