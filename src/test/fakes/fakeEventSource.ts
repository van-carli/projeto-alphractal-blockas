import type {
  FeesStreamEventName,
  FeesStreamMessageEvent,
  FeesStreamSource,
} from '@/modules/fees/presentation/sse/eventSource'
import { EVENT_SOURCE_READY_STATE } from '@/modules/fees/presentation/sse/eventSource'

type Listener = (event: FeesStreamMessageEvent) => void

/**
 * EventSource falso e controlável manualmente, usado para simular
 * conexão, mensagens, quedas e reconexões do stream SSE nos testes.
 */
export class FakeEventSource implements FeesStreamSource {
  readonly urls: string[] = []
  readyState: FeesStreamSource['readyState'] = EVENT_SOURCE_READY_STATE.CONNECTING
  closed = false

  private listeners = new Map<FeesStreamEventName, Set<Listener>>()

  constructor(url: string) {
    this.urls.push(url)
  }

  addEventListener(type: FeesStreamEventName, listener: Listener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  removeEventListener(type: FeesStreamEventName, listener: Listener): void {
    this.listeners.get(type)?.delete(listener)
  }

  close(): void {
    this.closed = true
    this.readyState = EVENT_SOURCE_READY_STATE.CLOSED
  }

  emitOpen(): void {
    this.readyState = EVENT_SOURCE_READY_STATE.OPEN
    this.dispatch('open', { data: '' })
  }

  emitError(): void {
    this.readyState = EVENT_SOURCE_READY_STATE.CONNECTING
    this.dispatch('error', { data: '' })
  }

  emitSnapshot(raw: string, lastEventId?: string): void {
    this.dispatch('snapshot', { data: raw, lastEventId })
  }

  emitHealth(raw: string): void {
    this.dispatch('health', { data: raw })
  }

  private dispatch(type: FeesStreamEventName, event: FeesStreamMessageEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}
