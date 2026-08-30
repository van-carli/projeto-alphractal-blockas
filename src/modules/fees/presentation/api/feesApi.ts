import {
  ApiErrorSchema,
  FeeSnapshotSchema,
  TelemetryHealthSchema,
  type FeeSnapshot,
  type TelemetryHealth,
} from '@/modules/fees'

async function parseResponse<T>(
  response: Response,
  parser: (data: unknown) => T,
): Promise<T> {
  const data: unknown = await response.json()

  if (!response.ok) {
    const apiError = ApiErrorSchema.safeParse(data)

    if (apiError.success) {
      throw new Error(apiError.data.error.message)
    }

    throw new Error('Erro inesperado ao consultar a API')
  }

  return parser(data)
}

export async function getFeesSnapshot(): Promise<FeeSnapshot> {
  const response = await fetch('/api/fees/snapshot')

  return parseResponse(response, (data) => FeeSnapshotSchema.parse(data))
}

export async function getFeesHistory(): Promise<FeeSnapshot[]> {
  const response = await fetch('/api/fees/history')

  return parseResponse(response, (data) => {
    if (!Array.isArray(data)) {
      throw new Error('Histórico de fees inválido')
    }

    return data.map((item) => FeeSnapshotSchema.parse(item))
  })
}

export async function getHealth(): Promise<TelemetryHealth> {
  const response = await fetch('/api/health')

  return parseResponse(response, (data) => TelemetryHealthSchema.parse(data))
}