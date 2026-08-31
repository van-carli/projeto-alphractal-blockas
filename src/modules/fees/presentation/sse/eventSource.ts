export type FeesStreamEventName = 'open' | 'error' | 'snapshot' | 'health'

export type FeesStreamMessageEvent = Readonly<{
  data: string
  lastEventId?: string
}>

export const EVENT_SOURCE_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
} as const

export type EventSourceReadyState =
  (typeof EVENT_SOURCE_READY_STATE)[keyof typeof EVENT_SOURCE_READY_STATE]

export interface FeesStreamSource {
  readonly readyState: EventSourceReadyState
  addEventListener(
    type: FeesStreamEventName,
    listener: (event: FeesStreamMessageEvent) => void,
  ): void
  removeEventListener(
    type: FeesStreamEventName,
    listener: (event: FeesStreamMessageEvent) => void,
  ): void
  close(): void
}

export type FeesStreamSourceFactory = (url: string) => FeesStreamSource

export const createBrowserEventSource: FeesStreamSourceFactory = (url) => {
  return new EventSource(url) as unknown as FeesStreamSource
}
