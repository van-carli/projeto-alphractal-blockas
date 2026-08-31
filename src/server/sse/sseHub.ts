import type { FeeSnapshot } from "@/modules/fees/domain/fee-snapshot";
import type { TelemetryHealth } from "@/modules/fees/domain/telemetry-health";

type ClientController = ReadableStreamDefaultController<Uint8Array>;
type AbortRegistration = Readonly<{
  signal: AbortSignal;
  listener: () => void;
}>;

export class SseHub {
  private clients = new Set<ClientController>();
  private abortRegistrations = new Map<ClientController, AbortRegistration>();
  private encoder = new TextEncoder();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly heartbeatIntervalMs: number = 15_000,
    private readonly retryIntervalMs: number = 3_000
  ) {}

  connect(
    initialSnapshot: FeeSnapshot | null,
    initialHealth: TelemetryHealth | null = null,
    signal?: AbortSignal
  ): ReadableStream<Uint8Array> {
    let controllerRef: ClientController;

    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        controllerRef = controller;
        this.clients.add(controller);
        this.ensureHeartbeat();

        if (signal) {
          const abortListener = () => {
            this.removeClient(controller);
            try {
              controller.close();
            } catch {
              // a resposta já foi encerrada
            }
          };
          this.abortRegistrations.set(controller, {
            signal,
            listener: abortListener,
          });
          signal.addEventListener("abort", abortListener, { once: true });

          if (signal.aborted) {
            abortListener();
            return;
          }
        }

        let initialPayload = `retry: ${this.retryIntervalMs}\n\n`;
        if (initialSnapshot) {
          initialPayload += this.formatEvent(
            "snapshot",
            initialSnapshot,
            initialSnapshot.sequence.toString()
          );
        }
        if (initialHealth) {
          initialPayload += this.formatEvent("health", initialHealth);
        }
        this.enqueue(controller, initialPayload);
      },
      cancel: () => {
        this.removeClient(controllerRef);
      },
    });
  }

  broadcastSnapshot(snapshot: FeeSnapshot): void {
    this.broadcast("snapshot", snapshot, snapshot.sequence.toString());
  }

  broadcastHealth(health: TelemetryHealth): void {
    this.broadcast("health", health);
  }

  clientCount(): number {
    return this.clients.size;
  }

  close(): void {
    this.stopHeartbeat();
    for (const controller of [...this.clients]) {
      this.removeClient(controller);
      try {
        controller.close();
      } catch {
        // cliente já fechado
      }
    }
  }

  private broadcast(event: string, data: unknown, id?: string): void {
    const message = this.formatEvent(event, data, id);
    for (const controller of [...this.clients]) {
      this.enqueue(controller, message);
    }
  }

  private formatEvent(event: string, data: unknown, id?: string): string {
    const idLine = id ? `id: ${id}\n` : "";
    return `event: ${event}\n${idLine}data: ${JSON.stringify(data)}\n\n`;
  }

  private enqueue(controller: ClientController, message: string): void {
    try {
      controller.enqueue(this.encoder.encode(message));
    } catch {
      this.removeClient(controller);
    }
  }

  private removeClient(controller: ClientController): void {
    this.clients.delete(controller);

    const registration = this.abortRegistrations.get(controller);
    if (registration) {
      registration.signal.removeEventListener("abort", registration.listener);
      this.abortRegistrations.delete(controller);
    }

    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      for (const controller of [...this.clients]) {
        this.enqueue(controller, ": keep-alive\n\n");
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
