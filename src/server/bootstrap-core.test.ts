import { describe, expect, it, vi } from 'vitest'

import { createServerBootstrap } from './bootstrap-core'

describe('createServerBootstrap', () => {
  it('inicia o runtime somente uma vez com chamadas concorrentes', async () => {
    const startRuntime = vi.fn(async () => undefined)
    const bootstrap = createServerBootstrap(startRuntime)

    await Promise.all([
      bootstrap.start(),
      bootstrap.start(),
      bootstrap.start(),
    ])

    expect(startRuntime).toHaveBeenCalledTimes(1)
    expect(bootstrap.getState()).toMatchObject({ status: 'started' })
  })

  it('executa o encerramento uma vez e permite reiniciar', async () => {
    const stopRuntime = vi.fn(async () => undefined)
    const startRuntime = vi.fn(async () => stopRuntime)
    const bootstrap = createServerBootstrap(startRuntime)

    await bootstrap.start()
    await Promise.all([bootstrap.stop(), bootstrap.stop()])
    await bootstrap.start()

    expect(startRuntime).toHaveBeenCalledTimes(2)
    expect(stopRuntime).toHaveBeenCalledTimes(1)
    expect(bootstrap.getState()).toMatchObject({ status: 'started' })
  })

  it('permite nova tentativa após uma falha de inicialização', async () => {
    const startRuntime = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce(undefined)
    const bootstrap = createServerBootstrap(startRuntime)

    await expect(bootstrap.start()).rejects.toThrow('falha temporária')
    expect(bootstrap.getState()).toEqual({
      status: 'failed',
      startedAt: null,
    })

    await bootstrap.start()

    expect(startRuntime).toHaveBeenCalledTimes(2)
    expect(bootstrap.getState()).toMatchObject({ status: 'started' })
  })
})
