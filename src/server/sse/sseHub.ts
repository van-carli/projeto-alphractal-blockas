import type { FeeSnapshot } from "@/modules/fees/domain/fee-snapshot";
import type { TelemetryHealth } from "@/modules/fees/domain/telemetry-health";

export class SseHub {
  private clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private encoder = new TextEncoder();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly heartbeatIntervalMs: number = 30_000) {}

  /**
   * Cria um ReadableStream para um novo cliente SSE.
   * Envia o snapshot atual imediatamente (se existir) e depois fica
   * recebendo atualizações via broadcast.
   */
  connect(initialSnapshot: FeeSnapshot | null): ReadableStream<Uint8Array> {
    let controllerRef: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controllerRef = controller;
        this.clients.add(controller);
        this.ensureHeartbeat();

        if (initialSnapshot) {
          this.sendToClient(controller, "snapshot", initialSnapshot);
        }
      },
      cancel: () => {
        this.clients.delete(controllerRef);
        if (this.clients.size === 0) {
          this.stopHeartbeat();
        }
      },
    });

    return stream;
  }

  broadcastSnapshot(snapshot: FeeSnapshot): void {
    this.broadcast("snapshot", snapshot);
  }

  broadcastHealth(health: TelemetryHealth): void {
    this.broadcast("health", health);
  }

  clientCount(): number {
    return this.clients.size;
  }

  /** Limpa todos os clientes e para o heartbeat. */
  close(): void {
    this.stopHeartbeat();
    for (const controller of this.clients) {
      try {
        controller.close();
      } catch {
        // cliente já fechado
      }
    }
    this.clients.clear();
  }

  private broadcast(event: string, data: unknown): void {
    for (const controller of this.clients) {
      this.sendToClient(controller, event, data);
    }
  }

  private sendToClient(
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: string,
    data: unknown
  ): void {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(this.encoder.encode(message));
    } catch {
      // enqueue falhou = cliente desconectou, remove
      this.clients.delete(controller);
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      const heartbeat = this.encoder.encode(": heartbeat\n\n");
      for (const controller of this.clients) {
        try {
          controller.enqueue(heartbeat);
        } catch {
          this.clients.delete(controller);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}