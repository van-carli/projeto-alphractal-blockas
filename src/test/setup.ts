import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'

export const server = setupServer(...handlers)

const originalFetch = globalThis.fetch

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  })

  const mswFetch = globalThis.fetch

  globalThis.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = `http://localhost${input}`
    }

    return mswFetch(input, init)
  }
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  globalThis.fetch = originalFetch
  server.close()
})