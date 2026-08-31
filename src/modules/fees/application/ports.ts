import type { FeeSnapshot } from '../domain/fee-snapshot'

export type Unsubscribe = () => void | Promise<void>
export type EthereumConnectionListener = (connected: boolean) => void

export type EthereumBlockTelemetry = Readonly<{
  chainId: number
  blockNumber: bigint
  blockHash: `0x${string}`
  timestamp: Date
  baseFeePerGas: bigint
  gasUsed: bigint
  gasLimit: bigint
}>

export interface EthereumTelemetrySource {
  subscribeToBlocks(
    listener: (block: EthereumBlockTelemetry) => void | Promise<void>,
    connectionListener?: EthereumConnectionListener,
  ): Promise<Unsubscribe>
}

export type EthUsdQuote = Readonly<{
  price: number
  updatedAt: Date
}>

export interface EthUsdPriceSource {
  getCurrentPrice(): Promise<EthUsdQuote>
}

export type SnapshotHistoryQuery = Readonly<{
  chainId: number
  from?: Date
  to?: Date
  limit: number
}>

export interface SnapshotRepository {
  save(snapshot: FeeSnapshot): Promise<void>
  getLatest(chainId: number): Promise<FeeSnapshot | null>
  getHistory(query: SnapshotHistoryQuery): Promise<readonly FeeSnapshot[]>
}

export interface Clock {
  now(): Date
}

export type PriorityFeeGwei = Readonly<{
  slow: number
  standard: number
  fast: number
}>

export interface PriorityFeeSource {
  getPriorityFeeGwei(blockNumber: bigint): Promise<PriorityFeeGwei>
}
