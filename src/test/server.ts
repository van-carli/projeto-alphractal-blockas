import { setupServer } from 'msw/node'

import { feesHandlers } from './handlers/fees'

export const server = setupServer(...feesHandlers)
