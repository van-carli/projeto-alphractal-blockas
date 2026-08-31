import { describe, expect, it } from 'vitest'

import {
  getFeesHistory,
  getFeesSnapshot,
  getHealth,
} from './feesApi'

describe('feesApi', () => {
  it('carrega o snapshot', async () => {
    const snapshot = await getFeesSnapshot()

    expect(snapshot.chainId).toBe(1)
    expect(snapshot.blockNumber).toBe('23123456')
    expect(snapshot.congestionLevel).toBe('normal')
  })

  it('carrega o histórico', async () => {
    const history = await getFeesHistory()

    expect(history).toHaveLength(3)
    expect(history[0].blockNumber).toBe('23123454')
  })

  it('carrega o health', async () => {
    const health = await getHealth()

    expect(health.status).toBe('healthy')
    expect(health.rpcConnected).toBe(true)
  })
})