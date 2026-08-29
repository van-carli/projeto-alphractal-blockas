import type {
  EthereumTelemetrySource,
  EthereumBlockTelemetry,
  Unsubscribe,
} from "@/modules/fees/application/ports";

export class FakeTelemetrySource implements EthereumTelemetrySource {
  private listeners: ((block: EthereumBlockTelemetry) => void | Promise<void>)[] = [];

  async subscribeToBlocks(
    listener: (block: EthereumBlockTelemetry) => void | Promise<void>
  ): Promise<Unsubscribe> {
    this.listeners.push(listener);

    return async () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Só existe para uso em teste: simula a chegada de um bloco novo. */
  async emitBlock(block: EthereumBlockTelemetry): Promise<void> {
    for (const listener of this.listeners) {
      await listener(block);
    }
  }

  /** Quantos ouvintes estão inscritos agora, útil para testar unsubscribe. */
  listenerCount(): number {
    return this.listeners.length;
  }
}