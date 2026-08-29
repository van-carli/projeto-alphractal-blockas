import { getRuntime } from "@/server/application-runtime";
import { createApiError } from "@/modules/fees/domain/api-error";

export async function GET(): Promise<Response> {
  const runtime = getRuntime();
  if (!runtime) {
    return new Response(
      JSON.stringify(
        createApiError("UNAVAILABLE", "Telemetria ainda não inicializada")
      ),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const snapshot = await runtime.repository.getLatest(runtime.chainId);
  const stream = runtime.sseHub.connect(snapshot);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}