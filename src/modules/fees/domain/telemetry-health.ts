import { z } from 'zod'

export const TelemetryHealthSchema = z
  .object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    rpcConnected: z.boolean(),
    lastBlock: z.string().regex(/^\d+$/).nullable(),
    lastBlockAt: z.string().datetime({ offset: true }).nullable(),
    priceUpdatedAt: z.string().datetime({ offset: true }).nullable(),
    priceStatus: z.enum(['fresh', 'stale', 'unavailable']),
    sseClients: z.number().int().nonnegative(),
  })
  .strict()

export type TelemetryHealth = z.infer<typeof TelemetryHealthSchema>
