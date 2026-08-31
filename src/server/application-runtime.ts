import type { ServerRuntimeStop } from "./bootstrap-core";
import { getServerEnv } from "./config/env";
import { SystemClock } from "./clock";
import { ViemBlockSource } from "./rpc/viemBlockSource";
import { ViemPriorityFeeSource } from "./rpc/viemPriorityFeeSource";
import { ViemPendingTransactionSource } from "./rpc/viemPendingTransactionSource";
import { HttpEthUsdPriceSource } from "./price/httpEthUsdPriceSource";
import { InMemorySnapshotRepository } from "@/modules/fees/domain/snapshotRepository";
import { SseHub } from "./sse/sseHub";
import {
  FeeSnapshotService,
  type OperationDefinition,
} from "@/modules/fees/application/feeSnapshotService";
import { logger } from "./logger";
import { createPublicClient, webSocket } from "viem";
import { mainnet } from "viem/chains";

const DEFAULT_OPERATIONS: OperationDefinition[] = [
  { operation: "ETH transfer", gasUnits: 21000 },
];

const CHAIN_ID = 1;
const STALE_THRESHOLD_MS = 120_000; // 2 minutos

export type ApplicationRuntime = Readonly<{
  repository: InMemorySnapshotRepository;
  sseHub: SseHub;
  feeService: FeeSnapshotService;
  chainId: number;
}>;

// Usa globalThis para garantir uma única instância mesmo quando o
// bundler cria módulos isolados para instrumentation e route handlers (dev).
const runtimeGlobalKey = "__alphractalApplicationRuntime__" as const;

type RuntimeGlobal = typeof globalThis & {
  [runtimeGlobalKey]?: ApplicationRuntime | null;
};

/**
 * Chamado pelos route handlers para acessar o runtime.
 * Retorna null se o servidor ainda não terminou de iniciar.
 */
export function getRuntime(): ApplicationRuntime | null {
  return (globalThis as RuntimeGlobal)[runtimeGlobalKey] ?? null;
}

function setRuntime(runtime: ApplicationRuntime | null): void {
  (globalThis as RuntimeGlobal)[runtimeGlobalKey] = runtime;
}

export async function startApplicationRuntime(): Promise<ServerRuntimeStop> {
  const env = getServerEnv();
  const clock = new SystemClock();
  const ethereumClient = createPublicClient({
    chain: mainnet,
    transport: webSocket(env.ETHEREUM_WS_RPC_URL, {
      reconnect: { attempts: 10, delay: 2_000 },
    }),
  });

  const telemetrySource = new ViemBlockSource(ethereumClient);
  const priorityFeeSource = new ViemPriorityFeeSource(ethereumClient);
  const pendingTransactionSource = new ViemPendingTransactionSource(
    ethereumClient
  );

  const priceSource = new HttpEthUsdPriceSource({
    apiUrl: env.ETH_USD_API_URL,
    clock,
    refreshIntervalMs: env.ETH_USD_POLL_INTERVAL_MS,
  });

  const repository = new InMemorySnapshotRepository(env.HISTORY_MAX_POINTS);
  const sseHub = new SseHub();

  const feeService = new FeeSnapshotService({
    telemetrySource,
    priorityFeeSource,
    pendingTransactionSource,
    priceSource,
    repository,
    sseHub,
    clock,
    staleThresholdMs: STALE_THRESHOLD_MS,
    operations: DEFAULT_OPERATIONS,
  });

  const stopPipeline = await feeService.start();
  logger.info("[runtime] pipeline de telemetria iniciado");

  setRuntime({ repository, sseHub, feeService, chainId: CHAIN_ID });

  return async () => {
    try {
      await stopPipeline();
      const rpcClient = await ethereumClient.transport.getRpcClient();
      rpcClient.close();
    } finally {
      sseHub.close();
      setRuntime(null);
      logger.info("[runtime] pipeline de telemetria encerrado");
    }
  };
}
