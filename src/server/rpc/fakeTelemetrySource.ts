import type {
  EthereumTelemetrySource,
  EthereumBlockTelemetry,
  EthereumConnectionListener,
  Unsubscribe,
} from "@/modules/fees/application/ports";

export class FakeTelemetrySource implements EthereumTelemetrySource {
  private listeners: ((block: EthereumBlockTelemetry) => void | Promise<void>)[] = [];
  private connectionListeners: EthereumConnectionListener[] = [];

  async subscribeToBlocks(
    listener: (block: EthereumBlockTelemetry) => void | Promise<void>,
    connectionListener?: EthereumConnectionListener
  ): Promise<Unsubscribe> {
    this.listeners.push(listener);
    if (connectionListener) {
      this.connectionListeners.push(connectionListener);
    }

    return async () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      if (connectionListener) {
        this.connectionListeners = this.connectionListeners.filter(
          (candidate) => candidate !== connectionListener
        );
      }
    };
  }

  /** Só existe para uso em teste: simula a chegada de um bloco novo. */
  async emitBlock(block: EthereumBlockTelemetry): Promise<void> {
    for (const listener of this.listeners) {
      await listener(block);
    }
  }

  emitConnectionStatus(connected: boolean): void {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }

  /** Quantos ouvintes estão inscritos agora, útil para testar unsubscribe. */
  listenerCount(): number {
    return this.listeners.length;
  }
}
