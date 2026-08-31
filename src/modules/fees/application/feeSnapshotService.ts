import type {
  EthereumTelemetrySource,
  EthereumBlockTelemetry,
  EthUsdPriceSource,
  EthUsdQuote,
  PendingTransactionSource,
  PriorityFeeSource,
  SnapshotRepository,
  Clock,
  Unsubscribe,
} from "./ports";
import type { FeeSnapshot } from "../domain/fee-snapshot";
import type { TelemetryHealth } from "../domain/telemetry-health";
import type { SseHub } from "@/server/sse/sseHub";
import { calculateCongestion, buildEstimatedCost } from "../calculations";
import { logger } from "@/server/logger";

const WEI_PER_GWEI = 1e9;

export type OperationDefinition = Readonly<{
  operation: string;
  gasUnits: number;
}>;

export type FeeSnapshotServiceOptions = Readonly<{
  telemetrySource: EthereumTelemetrySource;
  priorityFeeSource: PriorityFeeSource;
  pendingTransactionSource: PendingTransactionSource;
  priceSource: EthUsdPriceSource;
  repository: SnapshotRepository;
  sseHub: SseHub;
  clock: Clock;
  staleThresholdMs: number;
  operations: OperationDefinition[];
}>;

export class FeeSnapshotService {
  private readonly opts: FeeSnapshotServiceOptions;
  private sequence = 0;
  private unsubscribe: Unsubscribe | null = null;

  // estado de saúde, atualizado a cada bloco processado
  private rpcConnected = false;
  private lastBlock: string | null = null;
  private lastBlockAt: string | null = null;
  private lastPriceQuote: EthUsdQuote | null = null;
  private priceAvailable = false;
  private pendingObservations: Array<{ observedAtMs: number; count: number }> = [];
  private previousStandardFeeGwei: number | null = null;

  constructor(opts: FeeSnapshotServiceOptions) {
    this.opts = opts;
  }

  async start(): Promise<Unsubscribe> {
    if (this.unsubscribe) {
      throw new Error("FeeSnapshotService já está rodando");
    }

    let stopPendingTransactions: Unsubscribe = () => {};
    try {
      stopPendingTransactions =
        await this.opts.pendingTransactionSource.subscribeToPendingTransactions(
          (hashes) => this.recordPendingTransactions(hashes.length)
        );
    } catch (error) {
      logger.warn("[pipeline] transações pendentes indisponíveis", {
        error: error instanceof Error ? error.message : "desconhecido",
      });
    }

    try {
      const stopBlocks = await this.opts.telemetrySource.subscribeToBlocks(
        async (block) => {
          await this.handleBlock(block);
        },
        (connected) => {
          this.rpcConnected = connected;
          this.opts.sseHub.broadcastHealth(this.getHealth());
        },
      );

      this.unsubscribe = async () => {
        await stopBlocks();
        await stopPendingTransactions();
      };
    } catch (error) {
      await stopPendingTransactions();
      throw error;
    }

    this.rpcConnected = true;
    logger.info("[pipeline] inscrito em blocos");

    return async () => {
      await this.unsubscribe?.();
      this.unsubscribe = null;
      this.rpcConnected = false;
      this.opts.sseHub.broadcastHealth(this.getHealth());
      logger.info("[pipeline] desinscrito de blocos");
    };
  }

  getHealth(): TelemetryHealth {
    const priceStatus = this.getPriceStatus();

    let status: "healthy" | "degraded" | "unhealthy";
    if (!this.rpcConnected) {
      status = "unhealthy";
    } else if (priceStatus === "stale" || priceStatus === "unavailable") {
      status = "degraded";
    } else {
      status = "healthy";
    }

    return {
      status,
      rpcConnected: this.rpcConnected,
      lastBlock: this.lastBlock,
      lastBlockAt: this.lastBlockAt,
      priceUpdatedAt: this.lastPriceQuote?.updatedAt.toISOString() ?? null,
      priceStatus,
      sseClients: this.opts.sseHub.clientCount(),
    };
  }

  private async handleBlock(block: EthereumBlockTelemetry): Promise<void> {
    try {
      const [priorityFees, priceQuote] = await Promise.all([
        this.opts.priorityFeeSource.getPriorityFeeGwei(block.blockNumber),
        this.opts.priceSource.getCurrentPrice(),
      ]);

      this.lastPriceQuote = priceQuote;
      this.priceAvailable = true;

      const baseFeeGwei = Number(block.baseFeePerGas) / WEI_PER_GWEI;
      const gasUsedRatio = Number(block.gasUsed) / Number(block.gasLimit);
      const pendingTransactionsPerSecond =
        this.getPendingTransactionsPerSecond();
      const standardFeeChangeRatio = this.previousStandardFeeGwei
        ? (priorityFees.standard - this.previousStandardFeeGwei) /
          this.previousStandardFeeGwei
        : 0;

      const estimatedCosts = this.opts.operations.map((op) =>
        buildEstimatedCost(
          op.operation,
          op.gasUnits,
          baseFeeGwei,
          priorityFees,
          priceQuote.price
        )
      );

      const snapshot: FeeSnapshot = {
        sequence: this.sequence,
        timestamp: this.opts.clock.now().toISOString(),
        chainId: block.chainId,
        blockNumber: block.blockNumber.toString(),
        blockHash: block.blockHash,
        baseFeeGwei,
        gasUsedRatio,
        priorityFeeGwei: priorityFees,
        ethUsd: priceQuote.price,
        priceUpdatedAt: priceQuote.updatedAt.toISOString(),
        priceStatus: this.isPriceStale(priceQuote) ? "stale" : "fresh",
        pendingTransactionsPerSecond,
        congestionLevel: calculateCongestion({
          gasUsedRatio,
          pendingTransactionsPerSecond,
          standardFeeChangeRatio,
        }),
        estimatedCosts,
      };

      const saved = await this.opts.repository.save(snapshot);
      if (!saved) {
        return;
      }

      this.sequence++;
      this.previousStandardFeeGwei = priorityFees.standard;
      this.lastBlock = snapshot.blockNumber;
      this.lastBlockAt = snapshot.timestamp;

      this.opts.sseHub.broadcastSnapshot(snapshot);
      this.opts.sseHub.broadcastHealth(this.getHealth());

      logger.info("[pipeline] snapshot salvo", {
        block: snapshot.blockNumber,
      });
    } catch (error) {
      logger.error("[pipeline] falha ao processar bloco", {
        block: block.blockNumber.toString(),
        error: error instanceof Error ? error.message : "desconhecido",
      });
    }
  }

  private isPriceStale(quote: EthUsdQuote): boolean {
    const elapsed = this.opts.clock.now().getTime() - quote.updatedAt.getTime();
    return elapsed > this.opts.staleThresholdMs;
  }

  private getPriceStatus(): "fresh" | "stale" | "unavailable" {
    if (!this.priceAvailable || !this.lastPriceQuote) return "unavailable";
    return this.isPriceStale(this.lastPriceQuote) ? "stale" : "fresh";
  }

  private recordPendingTransactions(count: number): void {
    this.prunePendingObservations();
    if (count > 0) {
      this.pendingObservations.push({
        observedAtMs: this.opts.clock.now().getTime(),
        count,
      });
      this.opts.sseHub.broadcastHealth(this.getHealth());
    }
  }

  private getPendingTransactionsPerSecond(): number {
    this.prunePendingObservations();
    return this.pendingObservations.reduce(
      (total, observation) => total + observation.count,
      0
    );
  }

  private prunePendingObservations(): void {
    const cutoff = this.opts.clock.now().getTime() - 1_000;
    this.pendingObservations = this.pendingObservations.filter(
      (observation) => observation.observedAtMs > cutoff
    );
  }
}
