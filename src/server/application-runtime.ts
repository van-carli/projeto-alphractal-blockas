import type { ServerRuntimeStop } from "./bootstrap-core";
import { getServerEnv } from "./config/env";
import { SystemClock } from "./clock";
import { ViemBlockSource } from "./rpc/viemBlockSource";
import { ViemPriorityFeeSource } from "./rpc/viemPriorityFeeSource";
import { HttpEthUsdPriceSource } from "./price/httpEthUsdPriceSource";
import { InMemorySnapshotRepository } from "@/modules/fees/domain/snapshotRepository";
import { SseHub } from "./sse/sseHub";
import {
  FeeSnapshotService,
  type OperationDefinition,
} from "@/modules/fees/application/feeSnapshotService";
import { logger } from "./logger";

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

let currentRuntime: ApplicationRuntime | null = null;

/**
 * Chamado pelos route handlers para acessar o runtime.
 * Retorna null se o servidor ainda não terminou de iniciar.
 */
export function getRuntime(): ApplicationRuntime | null {
  return currentRuntime;
}

export async function startApplicationRuntime(): Promise<ServerRuntimeStop> {
  const env = getServerEnv();
  const clock = new SystemClock();

  const telemetrySource = new ViemBlockSource(env.ETHEREUM_WS_RPC_URL);

  const priorityFeeSource = new ViemPriorityFeeSource(
    env.ETHEREUM_WS_RPC_URL
  );

  const priceSource = new HttpEthUsdPriceSource({
    apiUrl: env.ETH_USD_API_URL,
    clock,
  });

  const repository = new InMemorySnapshotRepository(env.HISTORY_MAX_POINTS);
  const sseHub = new SseHub();

  const feeService = new FeeSnapshotService({
    telemetrySource,
    priorityFeeSource,
    priceSource,
    repository,
    sseHub,
    clock,
    staleThresholdMs: STALE_THRESHOLD_MS,
    operations: DEFAULT_OPERATIONS,
  });

  const stopPipeline = await feeService.start();
  logger.info("[runtime] pipeline de telemetria iniciado");

  currentRuntime = { repository, sseHub, feeService, chainId: CHAIN_ID };

  return async () => {
    await stopPipeline();
    sseHub.close();
    currentRuntime = null;
    logger.info("[runtime] pipeline de telemetria encerrado");
  };
}