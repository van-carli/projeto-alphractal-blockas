import { z } from 'zod'

const nonNegativeFiniteNumber = z.number().finite().nonnegative()
const blockHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .transform((value) => value as `0x${string}`)

export const CongestionLevelSchema = z.enum([
  'low',
  'normal',
  'high',
  'critical',
])

export const EstimatedCostSchema = z
  .object({
    operation: z.string().trim().min(1),
    gasUnits: z.number().int().positive(),
    slowUsd: nonNegativeFiniteNumber,
    standardUsd: nonNegativeFiniteNumber,
    fastUsd: nonNegativeFiniteNumber,
  })
  .strict()

export const FeeSnapshotSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
    timestamp: z.string().datetime({ offset: true }),
    chainId: z.number().int().positive(),
    blockNumber: z.string().regex(/^\d+$/),
    blockHash: blockHashSchema,
    baseFeeGwei: nonNegativeFiniteNumber,
    gasUsedRatio: z.number().finite().min(0).max(1),
    priorityFeeGwei: z
      .object({
        slow: nonNegativeFiniteNumber,
        standard: nonNegativeFiniteNumber,
        fast: nonNegativeFiniteNumber,
      })
      .strict(),
    ethUsd: nonNegativeFiniteNumber,
    priceUpdatedAt: z.string().datetime({ offset: true }),
    priceStatus: z.enum(['fresh', 'stale']),
    pendingTransactionsPerSecond: nonNegativeFiniteNumber.nullable(),
    congestionLevel: CongestionLevelSchema,
    estimatedCosts: z.array(EstimatedCostSchema),
  })
  .strict()

export type CongestionLevel = z.infer<typeof CongestionLevelSchema>
export type EstimatedCost = z.infer<typeof EstimatedCostSchema>
export type FeeSnapshot = z.infer<typeof FeeSnapshotSchema>
