export type ServerBootstrapStatus =
  | 'idle'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'failed'

export type ServerBootstrapState = Readonly<{
  status: ServerBootstrapStatus
  startedAt: string | null
}>

export type ServerRuntimeStop = () => void | Promise<void>
export type ServerRuntimeStart = () =>
  | void
  | ServerRuntimeStop
  | Promise<void | ServerRuntimeStop>

export interface ServerBootstrap {
  start(): Promise<void>
  stop(): Promise<void>
  getState(): ServerBootstrapState
}

export function createServerBootstrap(
  startRuntime: ServerRuntimeStart,
): ServerBootstrap {
  let status: ServerBootstrapStatus = 'idle'
  let startedAt: string | null = null
  let stopRuntime: ServerRuntimeStop | null = null
  let startPromise: Promise<void> | null = null
  let stopPromise: Promise<void> | null = null

  async function start(): Promise<void> {
    if (status === 'started') return
    if (startPromise) return startPromise
    if (stopPromise) await stopPromise

    status = 'starting'
    startPromise = (async () => {
      const teardown = await startRuntime()
      stopRuntime = teardown ?? null
      startedAt = new Date().toISOString()
      status = 'started'
    })()

    try {
      await startPromise
    } catch (error) {
      status = 'failed'
      startedAt = null
      throw error
    } finally {
      startPromise = null
    }
  }

  async function stop(): Promise<void> {
    if (stopPromise) return stopPromise
    if (startPromise) await startPromise
    if (stopPromise) return stopPromise

    if (status !== 'started') {
      status = 'idle'
      startedAt = null
      return
    }

    status = 'stopping'
    const teardown = stopRuntime
    stopRuntime = null

    stopPromise = (async () => {
      try {
        await teardown?.()
        status = 'idle'
        startedAt = null
      } catch (error) {
        status = 'failed'
        throw error
      } finally {
        stopPromise = null
      }
    })()

    return stopPromise
  }

  function getState(): ServerBootstrapState {
    return { status, startedAt }
  }

  return { start, stop, getState }
}
