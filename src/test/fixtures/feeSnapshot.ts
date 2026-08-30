import type { FeeSnapshot } from '@/modules/fees'

export const feeSnapshotFixture: FeeSnapshot = {
  sequence: 1,
  timestamp: '2026-08-29T17:00:00.000Z',
  chainId: 1,
  blockNumber: '23123456',
  blockHash:
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  baseFeeGwei: 12.5,
  gasUsedRatio: 0.65,
  priorityFeeGwei: {
    slow: 0.8,
    standard: 1.5,
    fast: 3.2,
  },
  ethUsd: 3450.5,
  priceUpdatedAt: '2026-08-29T16:59:45.000Z',
  priceStatus: 'fresh',
  pendingTransactionsPerSecond: 125.4,
  congestionLevel: 'normal',
  estimatedCosts: [
    {
      operation: 'Transfer ETH',
      gasUnits: 21000,
      slowUsd: 0.96,
      standardUsd: 1.0,
      fastUsd: 1.14,
    },
    {
      operation: 'Swap',
      gasUnits: 150000,
      slowUsd: 6.85,
      standardUsd: 7.2,
      fastUsd: 7.85,
    },
  ],
}