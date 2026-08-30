import type { FeeSnapshot, TelemetryHealth } from '@/modules/fees'

export const feeSnapshotFixture: FeeSnapshot = {
  sequence: 42,
  timestamp: '2026-08-29T17:00:00.000Z',
  chainId: 1,
  blockNumber: '23123456',
  blockHash:
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  baseFeeGwei: 12.5,
  gasUsedRatio: 0.62,
  priorityFeeGwei: {
    slow: 0.8,
    standard: 1.5,
    fast: 3.2,
  },
  ethUsd: 4210.5,
  priceUpdatedAt: '2026-08-29T16:59:45.000Z',
  priceStatus: 'fresh',
  pendingTransactionsPerSecond: 18.4,
  congestionLevel: 'normal',
  estimatedCosts: [
    {
      operation: 'Transferência ETH',
      gasUnits: 21000,
      slowUsd: 1.55,
      standardUsd: 1.67,
      fastUsd: 1.91,
    },
    {
      operation: 'Swap',
      gasUnits: 150000,
      slowUsd: 11.07,
      standardUsd: 11.84,
      fastUsd: 12.91,
    },
  ],
}

export const feeHistoryFixture: FeeSnapshot[] = [
  {
    ...feeSnapshotFixture,
    sequence: 40,
    timestamp: '2026-08-29T16:58:00.000Z',
    blockNumber: '23123454',
    blockHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    baseFeeGwei: 10.2,
    gasUsedRatio: 0.48,
    congestionLevel: 'low',
  },
  {
    ...feeSnapshotFixture,
    sequence: 41,
    timestamp: '2026-08-29T16:59:00.000Z',
    blockNumber: '23123455',
    blockHash:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    baseFeeGwei: 11.4,
    gasUsedRatio: 0.55,
    congestionLevel: 'normal',
  },
  feeSnapshotFixture,
]

export const telemetryHealthFixture: TelemetryHealth = {
  status: 'healthy',
  rpcConnected: true,
  lastBlock: feeSnapshotFixture.blockNumber,
  lastBlockAt: feeSnapshotFixture.timestamp,
  priceUpdatedAt: feeSnapshotFixture.priceUpdatedAt,
  priceStatus: 'fresh',
  sseClients: 1,
}