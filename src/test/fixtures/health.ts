import type { TelemetryHealth } from '@/modules/fees'

export const healthFixture: TelemetryHealth = {
  status: 'healthy',
  rpcConnected: true,
  lastBlock: '23123456',
  lastBlockAt: '2026-08-29T17:00:00.000Z',
  priceUpdatedAt: '2026-08-29T16:59:45.000Z',
  priceStatus: 'fresh',
  sseClients: 1,
}