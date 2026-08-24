import { z } from 'zod'

export const ApiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'UNAVAILABLE',
  'INTERNAL_ERROR',
])

export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: ApiErrorCodeSchema,
        message: z.string().trim().min(1),
        requestId: z.string().trim().min(1).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
  })
  .strict()

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>

type CreateApiErrorOptions = Readonly<{
  requestId?: string
  details?: Readonly<Record<string, unknown>>
}>

export function createApiError(
  code: ApiErrorCode,
  message: string,
  options: CreateApiErrorOptions = {},
): ApiError {
  return ApiErrorSchema.parse({
    error: {
      code,
      message,
      ...options,
    },
  })
}
