import type { QueryClient } from '@tanstack/react-query'

import {
  FeeSnapshotSchema,
  TelemetryHealthSchema,
  type FeeSnapshot,
  type TelemetryHealth,
} from '@/modules/fees'

import { feesQueryKeys } from '../api/feesQueries'
import {
  createBrowserEventSource,
  type FeesStreamMessageEvent,
  type FeesStreamSource,
  type FeesStreamSourceFactory,
} from './eventSource'
import type { FeesStreamConnectionState } from './connectionState'

const DEFAULT_STREAM_URL = '/api/fees/stream'
const DEFAULT_DEGRADED_THRESHOLD_MS = 5_000
const DEFAULT_OFFLINE_THRESHOLD_MS = 15_000
const MAX_HISTORY_LENGTH = 100

export type InvalidEventReason = 'json_parse_error' | 'schema_validation_error'

export type FeesStreamControllerOptions = Readonly<{
  queryClient: QueryClient
  url?: string
  createSource?: FeesStreamSourceFactory
  degradedThresholdMs?: number
  offlineThresholdMs?: number
  now?: () => number
  onStateChange?: (state: FeesStreamConnectionState) => void
  onInvalidEvent?: (reason: InvalidEventReason, raw: string) => void
}>

/**
 * Gerencia a conexão SSE com /api/fees/stream, mantendo o cache do
 * React Query sincronizado sem provocar refetch HTTP para eventos válidos.
 */
export class FeesStreamController {
  private readonly queryClient: QueryClient
  private readonly url: string
  private readonly createSource: FeesStreamSourceFactory
  private readonly degradedThresholdMs: number
  private readonly offlineThresholdMs: number
  private readonly now: () => number
  private readonly onStateChange?: (state: FeesStreamConnectionState) => void
  private readonly onInvalidEvent?: (
    reason: InvalidEventReason,
    raw: string,
  ) => void

  private source: FeesStreamSource | null = null
  private state: FeesStreamConnectionState = 'connecting'
  private lastSequence: number | null = null
  private lastHealthPayload: string | null = null
  private reconnecting = false
  private degradedTimer: ReturnType<typeof setTimeout> | null = null
  private offlineTimer: ReturnType<typeof setTimeout> | null = null

  private readonly handleOpen = () => this.setOpenState()
  private readonly handleError = () => this.handleStreamError()
  private readonly handleSnapshot = (event: FeesStreamMessageEvent) =>
    this.processSnapshotEvent(event.data)
  private readonly handleHealth = (event: FeesStreamMessageEvent) =>
    this.processHealthEvent(event.data)

  constructor(options: FeesStreamControllerOptions) {
    this.queryClient = options.queryClient
    this.url = options.url ?? DEFAULT_STREAM_URL
    this.createSource = options.createSource ?? createBrowserEventSource
    this.degradedThresholdMs =
      options.degradedThresholdMs ?? DEFAULT_DEGRADED_THRESHOLD_MS
    this.offlineThresholdMs =
      options.offlineThresholdMs ?? DEFAULT_OFFLINE_THRESHOLD_MS
    this.now = options.now ?? (() => Date.now())
    this.onStateChange = options.onStateChange
    this.onInvalidEvent = options.onInvalidEvent
  }

  getState(): FeesStreamConnectionState {
    return this.state
  }

  connect(): void {
    if (this.source) return

    const source = this.createSource(this.url)
    this.source = source

    source.addEventListener('open', this.handleOpen)
    source.addEventListener('error', this.handleError)
    source.addEventListener('snapshot', this.handleSnapshot)
    source.addEventListener('health', this.handleHealth)
  }

  disconnect(): void {
    this.clearTimers()

    if (this.source) {
      this.source.removeEventListener('open', this.handleOpen)
      this.source.removeEventListener('error', this.handleError)
      this.source.removeEventListener('snapshot', this.handleSnapshot)
      this.source.removeEventListener('health', this.handleHealth)
      this.source.close()
      this.source = null
    }
  }

  private setOpenState(): void {
    const wasReconnecting = this.reconnecting
    this.reconnecting = false
    this.clearTimers()
    this.setState('connected')

    if (wasReconnecting) {
      // A conexão caiu e voltou: reconcilia o cache com o servidor
      // para cobrir eventuais eventos perdidos durante a queda.
      this.lastSequence = null
      void this.queryClient.invalidateQueries({ queryKey: feesQueryKeys.all })
    }
  }

  private handleStreamError(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      this.reconnecting = true
      this.setState('reconectando')
    }

    if (!this.reconnecting) return

    if (!this.degradedTimer) {
      this.degradedTimer = setTimeout(() => {
        this.degradedTimer = null
        if (this.state === 'reconectando') {
          this.setState('degraded')
        }
      }, this.degradedThresholdMs)
    }

    if (!this.offlineTimer) {
      this.offlineTimer = setTimeout(() => {
        this.offlineTimer = null
        if (this.state === 'reconectando' || this.state === 'degraded') {
          this.setState('offline')
        }
      }, this.offlineThresholdMs)
    }
  }

  private processSnapshotEvent(raw: string): void {
    const snapshot = this.parseEvent(raw, FeeSnapshotSchema)
    if (!snapshot) return

    if (this.lastSequence !== null && snapshot.sequence <= this.lastSequence) {
      // Duplicado ou fora de ordem: descarta sem tocar no cache.
      return
    }

    this.lastSequence = snapshot.sequence
    this.applySnapshot(snapshot)
  }

  private applySnapshot(snapshot: FeeSnapshot): void {
    this.queryClient.setQueryData<FeeSnapshot>(
      feesQueryKeys.snapshot(),
      snapshot,
    )

    this.queryClient.setQueryData<FeeSnapshot[]>(
      feesQueryKeys.history(),
      (previous) => {
        const next = [...(previous ?? []), snapshot]
        return next.length > MAX_HISTORY_LENGTH
          ? next.slice(next.length - MAX_HISTORY_LENGTH)
          : next
      },
    )
  }

  private processHealthEvent(raw: string): void {
    const health = this.parseEvent(raw, TelemetryHealthSchema)
    if (!health) return

    if (this.lastHealthPayload === raw) {
      // Payload idêntico ao anterior: evita re-render desnecessário.
      return
    }
    this.lastHealthPayload = raw

    this.queryClient.setQueryData<TelemetryHealth>(
      feesQueryKeys.health(),
      health,
    )
  }

  private parseEvent<T>(
    raw: string,
    schema: { safeParse: (data: unknown) => { success: boolean; data?: T } },
  ): T | null {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      this.onInvalidEvent?.('json_parse_error', raw)
      return null
    }

    const result = schema.safeParse(parsed)
    if (!result.success || result.data === undefined) {
      this.onInvalidEvent?.('schema_validation_error', raw)
      return null
    }

    return result.data
  }

  private setState(state: FeesStreamConnectionState): void {
    if (this.state === state) return
    this.state = state
    this.onStateChange?.(state)
  }

  private clearTimers(): void {
    if (this.degradedTimer) {
      clearTimeout(this.degradedTimer)
      this.degradedTimer = null
    }
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer)
      this.offlineTimer = null
    }
  }
}
