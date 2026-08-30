import { http, HttpResponse } from 'msw'

import {
  feeHistoryFixture,
  feeSnapshotFixture,
  telemetryHealthFixture,
} from '../fixtures/fees'

export const feesHandlers = [
  http.get('/api/fees/snapshot', () => {
    return HttpResponse.json(feeSnapshotFixture)
  }),

  http.get('/api/fees/history', () => {
    return HttpResponse.json(feeHistoryFixture)
  }),

  http.get('/api/health', () => {
    return HttpResponse.json(telemetryHealthFixture)
  }),
] 
