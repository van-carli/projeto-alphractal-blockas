import { http, HttpResponse } from 'msw'

import { feeSnapshotFixture } from './fixtures/feeSnapshot'
import { healthFixture } from './fixtures/health'

const historyFixtures = [
  {
    ...feeSnapshotFixture,
    sequence: 0,
    blockNumber: '23123454',
  },
  {
    ...feeSnapshotFixture,
    sequence: 1,
    blockNumber: '23123455',
  },
  {
    ...feeSnapshotFixture,
    sequence: 2,
    blockNumber: '23123456',
  },
]

export const handlers = [
  http.get('http://localhost/api/fees/snapshot', () => {
    return HttpResponse.json(feeSnapshotFixture)
  }),

  http.get('http://localhost/api/fees/history', () => {
    return HttpResponse.json(historyFixtures)
  }),

  http.get('http://localhost/api/health', () => {
    return HttpResponse.json(healthFixture)
  }),
]