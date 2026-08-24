import { z } from 'zod'

const positiveIntegerString = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive())

const webSocketUrl = z.string().url().refine(
  (value) => {
    const protocol = new URL(value).protocol
    return protocol === 'ws:' || protocol === 'wss:'
  },
  { message: 'deve usar o protocolo ws: ou wss:' },
)

const postgresUrl = z.string().url().refine(
  (value) => {
    const protocol = new URL(value).protocol
    return protocol === 'postgres:' || protocol === 'postgresql:'
  },
  { message: 'deve usar o protocolo postgres: ou postgresql:' },
)

export const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ETHEREUM_WS_RPC_URL: webSocketUrl,
  DATABASE_URL: postgresUrl,
  ETH_USD_API_URL: z
    .string()
    .url()
    .default('https://api.coingecko.com/api/v3/simple/price'),
  ETH_USD_POLL_INTERVAL_MS: positiveIntegerString.default(30000),
  HISTORY_MAX_POINTS: positiveIntegerString.default(500),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export class InvalidServerEnvironmentError extends Error {
  readonly issues: readonly string[]

  constructor(error: z.ZodError) {
    const issues = error.issues.map((issue) => {
      const path = issue.path.join('.') || 'environment'
      return `${path}: ${issue.message}`
    })

    super(`Configuração inválida do servidor: ${issues.join('; ')}`)
    this.name = 'InvalidServerEnvironmentError'
    this.issues = issues
  }
}

export function parseServerEnv(
  input: Readonly<Record<string, string | undefined>>,
): ServerEnv {
  const result = ServerEnvSchema.safeParse(input)

  if (!result.success) {
    throw new InvalidServerEnvironmentError(result.error)
  }

  return result.data
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env)
}
