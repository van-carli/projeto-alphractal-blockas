import { describe, expect, it } from 'vitest'

import {
  ApiErrorSchema,
  FeeSnapshotSchema,
  TelemetryHealthSchema,
  createApiError,
} from '@/modules/fees'

const validSnapshot = {
  sequence: 1,
  timestamp: '2026-08-24T12:00:00.000Z',
  chainId: 1,
  blockNumber: '23900000',
  blockHash: `0x${'a'.repeat(64)}`,
  baseFeeGwei: 2.5,
  gasUsedRatio: 0.72,
  priorityFeeGwei: {
    slow: 0.5,
    standard: 1,
    fast: 2,
  },
  ethUsd: 4200,
  priceUpdatedAt: '2026-08-24T11:59:45.000Z',
  priceStatus: 'fresh',
  pendingTransactionsPerSecond: 32,
  congestionLevel: 'normal',
  estimatedCosts: [
    {
      operation: 'ETH transfer',
      gasUnits: 21000,
      slowUsd: 0.26,
      standardUsd: 0.31,
      fastUsd: 0.4,
    },
  ],
}

describe('contratos compartilhados de fees', () => {
  it('aceita um snapshot completo e estrito', () => {
    expect(FeeSnapshotSchema.parse(validSnapshot)).toMatchObject({
      chainId: 1,
      blockNumber: '23900000',
    })
  })

  it('rejeita hashes e proporções de gás inválidos', () => {
    const result = FeeSnapshotSchema.safeParse({
      ...validSnapshot,
      blockHash: '0x1234',
      gasUsedRatio: 1.5,
    })

    expect(result.success).toBe(false)
  })

  it('valida o estado de saúde serializável', () => {
    expect(
      TelemetryHealthSchema.parse({
        status: 'degraded',
        rpcConnected: false,
        lastBlock: '23900000',
        lastBlockAt: '2026-08-24T12:00:00.000Z',
        priceUpdatedAt: null,
        priceStatus: 'unavailable',
        sseClients: 0,
      }),
    ).toMatchObject({ status: 'degraded' })
  })

  it('produz erros de API no envelope padrão', () => {
    const apiError = createApiError('UNAVAILABLE', 'Telemetria indisponível', {
      requestId: 'request-1',
    })

    expect(ApiErrorSchema.parse(apiError)).toEqual(apiError)
  })
})
