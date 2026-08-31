import { describe, it, expect, vi, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

import { FeesStreamController } from './feesStreamController'
import { feesQueryKeys } from '../api/feesQueries'
import { FakeEventSource } from '@/test/fakes/fakeEventSource'
import {
  feeSnapshotFixture,
  telemetryHealthFixture,
} from '@/test/fixtures/fees'
import type { FeeSnapshot } from '@/modules/fees'

function setup(offlineThresholdMs = 15_000) {
  const queryClient = new QueryClient()
  let source: FakeEventSource | undefined

  const controller = new FeesStreamController({
    queryClient,
    offlineThresholdMs,
    createSource: (url) => {
      source = new FakeEventSource(url)
      return source
    },
  })

  controller.connect()

  return { queryClient, controller, getSource: () => source! }
}

describe('FeesStreamController', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('conecta ao stream informado', () => {
    const { getSource } = setup()
    expect(getSource().urls).toEqual(['/api/fees/stream'])
  })

  it('atualiza o cache com setQueryData ao receber snapshot, sem refetch', () => {
    const { queryClient, getSource } = setup()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    getSource().emitOpen()

    getSource().emitSnapshot(JSON.stringify(feeSnapshotFixture))

    expect(queryClient.getQueryData(feesQueryKeys.snapshot())).toEqual(
      feeSnapshotFixture,
    )
    expect(queryClient.getQueryData(feesQueryKeys.history())).toEqual([
      feeSnapshotFixture,
    ])
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('atualiza o cache de health ao receber evento health', () => {
    const { queryClient, getSource } = setup()
    getSource().emitOpen()

    getSource().emitHealth(JSON.stringify(telemetryHealthFixture))

    expect(queryClient.getQueryData(feesQueryKeys.health())).toEqual(
      telemetryHealthFixture,
    )
  })

  it('ignora eventos snapshot duplicados', () => {
    const { queryClient, getSource } = setup()
    getSource().emitOpen()

    getSource().emitSnapshot(JSON.stringify(feeSnapshotFixture))
    getSource().emitSnapshot(JSON.stringify(feeSnapshotFixture))

    expect(queryClient.getQueryData(feesQueryKeys.history())).toEqual([
      feeSnapshotFixture,
    ])
  })

  it('descarta eventos snapshot fora de ordem (sequence antiga)', () => {
    const { queryClient, getSource } = setup()
    getSource().emitOpen()

    const newer: FeeSnapshot = { ...feeSnapshotFixture, sequence: 50 }
    const older: FeeSnapshot = { ...feeSnapshotFixture, sequence: 10 }

    getSource().emitSnapshot(JSON.stringify(newer))
    getSource().emitSnapshot(JSON.stringify(older))

    expect(queryClient.getQueryData(feesQueryKeys.snapshot())).toEqual(newer)
    expect(queryClient.getQueryData(feesQueryKeys.history())).toEqual([newer])
  })

  it('ignora eventos health com payload idêntico ao anterior', () => {
    const { queryClient, getSource } = setup()
    getSource().emitOpen()

    const raw = JSON.stringify(telemetryHealthFixture)
    getSource().emitHealth(raw)
    const first = queryClient.getQueryData(feesQueryKeys.health())
    getSource().emitHealth(raw)
    const second = queryClient.getQueryData(feesQueryKeys.health())

    expect(first).toBe(second)
  })

  it('descarta eventos com JSON inválido sem tocar no cache', () => {
    const onInvalidEvent = vi.fn()
    const queryClient = new QueryClient()
    let source: FakeEventSource | undefined
    const controller = new FeesStreamController({
      queryClient,
      createSource: (url) => {
        source = new FakeEventSource(url)
        return source
      },
      onInvalidEvent,
    })
    controller.connect()

    source!.emitOpen()
    source!.emitSnapshot('{ not valid json')

    expect(onInvalidEvent).toHaveBeenCalledWith(
      'json_parse_error',
      '{ not valid json',
    )
    expect(queryClient.getQueryData(feesQueryKeys.snapshot())).toBeUndefined()
  })

  it('descarta eventos que falham na validação do schema', () => {
    const onInvalidEvent = vi.fn()
    const queryClient = new QueryClient()
    let source: FakeEventSource | undefined
    const controller = new FeesStreamController({
      queryClient,
      createSource: (url) => {
        source = new FakeEventSource(url)
        return source
      },
      onInvalidEvent,
    })
    controller.connect()
    source!.emitOpen()

    source!.emitSnapshot(JSON.stringify({ sequence: 1 }))

    expect(onInvalidEvent).toHaveBeenCalledWith(
      'schema_validation_error',
      JSON.stringify({ sequence: 1 }),
    )
    expect(queryClient.getQueryData(feesQueryKeys.snapshot())).toBeUndefined()
  })

  it('transita para reconectando ao cair a conexão e volta a connected ao reabrir', () => {
    const states: string[] = []
    const queryClient = new QueryClient()
    let source: FakeEventSource | undefined
    const controller = new FeesStreamController({
      queryClient,
      createSource: (url) => {
        source = new FakeEventSource(url)
        return source
      },
      onStateChange: (state) => states.push(state),
    })
    controller.connect()

    source!.emitOpen()
    source!.emitError()
    source!.emitOpen()

    expect(states).toEqual(['connected', 'reconectando', 'connected'])
    expect(controller.getState()).toBe('connected')
  })

  it('reconcilia o cache (invalidateQueries) ao recuperar a conexão após queda', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    let source: FakeEventSource | undefined
    const controller = new FeesStreamController({
      queryClient,
      createSource: (url) => {
        source = new FakeEventSource(url)
        return source
      },
    })
    controller.connect()

    source!.emitOpen()
    expect(invalidateSpy).not.toHaveBeenCalled()

    source!.emitError()
    source!.emitOpen()

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: feesQueryKeys.all })
  })

  it('fica offline após o stream permanecer caído além do limiar configurado', () => {
    vi.useFakeTimers()
    const states: string[] = []
    const queryClient = new QueryClient()
    let source: FakeEventSource | undefined
    const controller = new FeesStreamController({
      queryClient,
      offlineThresholdMs: 5_000,
      createSource: (url) => {
        source = new FakeEventSource(url)
        return source
      },
      onStateChange: (state) => states.push(state),
    })
    controller.connect()

    source!.emitOpen()
    source!.emitError()
    vi.advanceTimersByTime(5_000)

    expect(states).toEqual(['connected', 'reconectando', 'offline'])
    expect(controller.getState()).toBe('offline')
  })

  it('aceita o snapshot de reabertura mesmo com sequence igual ao último recebido antes da queda', () => {
    const queryClient = new QueryClient()
    let source: FakeEventSource | undefined
    const controller = new FeesStreamController({
      queryClient,
      createSource: (url) => {
        source = new FakeEventSource(url)
        return source
      },
    })
    controller.connect()

    source!.emitOpen()
    source!.emitSnapshot(JSON.stringify(feeSnapshotFixture))

    source!.emitError()
    source!.emitOpen()
    source!.emitSnapshot(JSON.stringify(feeSnapshotFixture))

    expect(queryClient.getQueryData(feesQueryKeys.snapshot())).toEqual(
      feeSnapshotFixture,
    )
  })

  it('remove os listeners e fecha a fonte ao desconectar', () => {
    const { controller, getSource } = setup()
    getSource().emitOpen()

    controller.disconnect()

    expect(getSource().closed).toBe(true)
  })
})
