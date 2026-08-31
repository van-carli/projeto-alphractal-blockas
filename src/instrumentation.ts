export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ bootstrapServer, shutdownServer }, { registerShutdownSignals }] =
    await Promise.all([
      import("./server/bootstrap"),
      import("./server/shutdown-signals"),
    ]);
  await bootstrapServer();
  registerShutdownSignals(shutdownServer);
}
